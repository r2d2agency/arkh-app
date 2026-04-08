declare global {
  interface Window {
    __arkheDomMutationGuardInstalled__?: boolean;
  }
}

export function installDomMutationGuard(rootElement?: HTMLElement | null) {
  if (typeof window === "undefined" || window.__arkheDomMutationGuardInstalled__) {
    return;
  }

  window.__arkheDomMutationGuardInstalled__ = true;

  const protectedElements = [document.documentElement, document.body, rootElement].filter(
    (element): element is HTMLElement => Boolean(element),
  );

  protectedElements.forEach((element) => {
    element.setAttribute("translate", "no");
    element.classList.add("notranslate");
  });

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function (child: Node) {
    if (!child || child.parentNode !== this) {
      return child;
    }

    return originalRemoveChild.call(this, child);
  } as typeof Node.prototype.removeChild;

  Node.prototype.insertBefore = function (newNode: Node, referenceNode: Node | null) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }

    return originalInsertBefore.call(this, newNode, referenceNode);
  } as typeof Node.prototype.insertBefore;
}
