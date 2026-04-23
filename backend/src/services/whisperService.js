/**
 * Transcrição de vídeos do YouTube via OpenAI Whisper.
 *
 * Estratégia:
 *  1. Tenta baixar o áudio do YouTube com yt-dlp (mais resiliente contra bloqueios).
 *  2. Se necessário, cai para @distube/ytdl-core como fallback.
 *  3. Converte/recorta para mp3 mono 16k via ffmpeg.
 *  4. Divide em chunks de até ~10 minutos para respeitar o limite de 25MB do Whisper.
 *  5. Envia cada chunk para a API /v1/audio/transcriptions (modelo whisper-1) e concatena.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const ytdl = require('@distube/ytdl-core');
const FormData = require('form-data');

const WHISPER_MAX_BYTES = 24 * 1024 * 1024; // margem de segurança em relação aos 25MB
const CHUNK_SECONDS = 600; // 10 minutos por chunk
const YT_DLP_CANDIDATES = [
  { cmd: 'yt-dlp', baseArgs: [] },
  { cmd: 'python3', baseArgs: ['-m', 'yt_dlp'] },
];

function timeToSeconds(t) {
  if (!t) return 0;
  const parts = String(t).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function runCommand(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-400)}`));
    });
    if (input) input.pipe(child.stdin);
  });
}

async function ffprobeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve(parseFloat(out.trim()) || 0);
      else reject(new Error(`ffprobe failed: ${err.slice(-400)}`));
    });
  });
}

async function resolveYtDlpCommand() {
  for (const candidate of YT_DLP_CANDIDATES) {
    try {
      await runCommand(candidate.cmd, [...candidate.baseArgs, '--version']);
      return candidate;
    } catch {}
  }
  return null;
}

function isYouTubeBotBlockError(message) {
  return /confirm you(?:'|’)re not a bot|captcha|sign in to confirm|unusual traffic/i.test(String(message || ''));
}

function formatDownloadFailure(errors) {
  const cleaned = errors.filter(Boolean).map((msg) => String(msg).trim());
  const detail = cleaned.join(' | ').slice(0, 700);
  if (cleaned.some(isYouTubeBotBlockError)) {
    return `O YouTube bloqueou a captura automática do áudio deste vídeo. Tente novamente em alguns minutos e confirme que o vídeo é público. Detalhes: ${detail}`;
  }
  return `Falha ao baixar áudio do YouTube. Detalhes: ${detail || 'sem detalhes adicionais.'}`;
}

async function downloadYouTubeAudioViaYtDlp(videoId, workDir) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(workDir, 'full.mp3');
  const ytDlp = await resolveYtDlpCommand();

  if (!ytDlp) {
    throw new Error('yt-dlp não está disponível no servidor');
  }

  await new Promise((resolve, reject) => {
    const dl = spawn(ytDlp.cmd, [
      ...ytDlp.baseArgs,
      '--no-playlist',
      '--no-warnings',
      '--ignore-config',
      '--extractor-args', 'youtube:player_client=android,web',
      '-f', 'bestaudio[acodec!=none]/bestaudio/best',
      '-o', '-',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const ff = spawn('ffmpeg', [
      '-y',
      '-i', 'pipe:0',
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-b:a', '64k',
      '-f', 'mp3',
      audioPath,
    ], { stdio: ['pipe', 'ignore', 'pipe'] });

    let dlErr = '';
    let ffErr = '';
    let settled = false;

    const fail = (message) => {
      if (settled) return;
      settled = true;
      try { dl.kill('SIGKILL'); } catch {}
      try { ff.kill('SIGKILL'); } catch {}
      reject(new Error(message));
    };

    dl.stderr.on('data', (d) => { dlErr += d.toString(); });
    ff.stderr.on('data', (d) => { ffErr += d.toString(); });
    dl.on('error', (err) => fail(`yt-dlp failed: ${err.message}`));
    ff.on('error', (err) => fail(`ffmpeg conversion failed: ${err.message}`));
    dl.stdout.pipe(ff.stdin);

    dl.on('close', (code) => {
      if (code !== 0) fail(`yt-dlp exited ${code}: ${dlErr.slice(-500)}`);
    });

    ff.on('close', (code) => {
      if (settled) return;
      if (code === 0) {
        settled = true;
        resolve();
      } else {
        fail(`ffmpeg conversion failed: ${ffErr.slice(-500)}`);
      }
    });
  });

  return audioPath;
}

async function downloadYouTubeAudioWithYtdlCore(videoId, workDir) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(workDir, 'full.mp3');

  // ytdl pega o stream de áudio puro; ffmpeg converte direto para mp3 mono 16k
  const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-i', 'pipe:0',
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-b:a', '64k',
      '-f', 'mp3',
      audioPath,
    ], { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderr = '';
    ff.stderr.on('data', (d) => { stderr += d.toString(); });
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg conversion failed: ${stderr.slice(-400)}`));
    });

    audioStream.on('error', (err) => {
      try { ff.kill('SIGKILL'); } catch {}
      reject(new Error(`YouTube download failed: ${err.message}`));
    });
    audioStream.pipe(ff.stdin);
  });

  return audioPath;
}

async function downloadYouTubeAudio(videoId, workDir, onProgress) {
  const failures = [];

  try {
    onProgress && onProgress('⬇️ Baixando áudio do YouTube via yt-dlp...');
    const audioPath = await downloadYouTubeAudioViaYtDlp(videoId, workDir);
    return { audioPath, transport: 'yt-dlp' };
  } catch (err) {
    failures.push(`yt-dlp: ${err.message}`);
    onProgress && onProgress('⚠️ yt-dlp falhou; tentando método alternativo de captura...');
  }

  try {
    onProgress && onProgress('🔁 Tentando método alternativo de captura do áudio...');
    const audioPath = await downloadYouTubeAudioWithYtdlCore(videoId, workDir);
    return { audioPath, transport: 'ytdl-core' };
  } catch (err) {
    failures.push(`ytdl-core: ${err.message}`);
  }

  throw new Error(formatDownloadFailure(failures));
}

async function sliceAudio(inputPath, start, duration, outputPath) {
  await runCommand('ffmpeg', [
    '-y',
    '-ss', String(start),
    '-t', String(duration),
    '-i', inputPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-b:a', '64k',
    '-f', 'mp3',
    outputPath,
  ]);
}

async function whisperTranscribe(filePath, apiKey, language = 'pt') {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-1');
  form.append('language', language);
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    text: data.text || '',
    segments: Array.isArray(data.segments) ? data.segments : [],
  };
}

function formatTranscriptFromSegments(segments) {
  // Formata transcrição com pausas (parágrafos) onde há gaps de >2s entre falas.
  if (!Array.isArray(segments) || segments.length === 0) return '';
  const lines = [];
  let buffer = [];
  let lastEnd = 0;
  for (const seg of segments) {
    const text = String(seg.text || '').trim();
    if (!text) continue;
    const gap = seg.start - lastEnd;
    if (buffer.length && gap > 2) {
      lines.push(buffer.join(' '));
      buffer = [];
    }
    buffer.push(text);
    lastEnd = seg.end || lastEnd;
  }
  if (buffer.length) lines.push(buffer.join(' '));
  return lines.join('\n\n');
}

/**
 * Transcreve um vídeo do YouTube usando Whisper.
 * @param {Object} opts
 * @param {string} opts.videoId
 * @param {string} opts.openaiApiKey
 * @param {string} [opts.startTime]   formato HH:MM:SS
 * @param {string} [opts.endTime]     formato HH:MM:SS
 * @param {string} [opts.language]    default 'pt'
 * @param {Function} [opts.onProgress] (msg) => void
 * @returns {Promise<{ text: string, segments: any[], source: string, durationSec: number }>}
 */
async function transcribeYouTubeWithWhisper({ videoId, openaiApiKey, startTime, endTime, language = 'pt', onProgress }) {
  if (!videoId) throw new Error('Video ID não informado');
  if (!openaiApiKey) throw new Error('API key da OpenAI não configurada');

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `whisper-${randomUUID().slice(0, 8)}-`));
  const log = (m) => { try { onProgress && onProgress(m); } catch {} };

  try {
    const { audioPath: fullAudio, transport } = await downloadYouTubeAudio(videoId, workDir, log);
    const stat = fs.statSync(fullAudio);
    log(`🎵 Áudio extraído via ${transport} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

    const fullDuration = await ffprobeDuration(fullAudio);
    const startSec = Math.max(0, timeToSeconds(startTime));
    const endSec = endTime ? Math.min(fullDuration, timeToSeconds(endTime)) : fullDuration;
    const totalSec = Math.max(1, endSec - startSec);
    log(`⏱️ Duração para transcrever: ${Math.round(totalSec)}s`);

    // Divide em chunks de CHUNK_SECONDS
    const chunkCount = Math.ceil(totalSec / CHUNK_SECONDS);
    const allSegments = [];
    let allText = '';

    for (let i = 0; i < chunkCount; i++) {
      const chunkStart = startSec + i * CHUNK_SECONDS;
      const chunkDur = Math.min(CHUNK_SECONDS, endSec - chunkStart);
      if (chunkDur <= 0) break;

      const chunkPath = path.join(workDir, `chunk-${i}.mp3`);
      log(`✂️ Recortando trecho ${i + 1}/${chunkCount} (${Math.round(chunkStart)}s → ${Math.round(chunkStart + chunkDur)}s)`);
      await sliceAudio(fullAudio, chunkStart, chunkDur, chunkPath);

      const chunkSize = fs.statSync(chunkPath).size;
      if (chunkSize > WHISPER_MAX_BYTES) {
        throw new Error(`Chunk ${i + 1} excede 25MB (${(chunkSize/1024/1024).toFixed(1)}MB). Reduza o intervalo.`);
      }

      log(`🤖 Whisper transcrevendo trecho ${i + 1}/${chunkCount}...`);
      const { text, segments } = await whisperTranscribe(chunkPath, openaiApiKey, language);

      // ajusta o offset dos segmentos para o tempo real do vídeo
      for (const seg of segments) {
        allSegments.push({
          ...seg,
          start: (seg.start || 0) + chunkStart,
          end: (seg.end || 0) + chunkStart,
        });
      }
      allText += (allText ? '\n' : '') + text;

      try { fs.unlinkSync(chunkPath); } catch {}
    }

    const formatted = formatTranscriptFromSegments(allSegments) || allText;

    return {
      text: formatted,
      segments: allSegments,
      source: `whisper:${transport}`,
      durationSec: totalSec,
    };
  } finally {
    try {
      // limpa diretório temporário
      for (const f of fs.readdirSync(workDir)) {
        try { fs.unlinkSync(path.join(workDir, f)); } catch {}
      }
      fs.rmdirSync(workDir);
    } catch {}
  }
}

module.exports = { transcribeYouTubeWithWhisper };
