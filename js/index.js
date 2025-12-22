if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

function closeModalIfOpen(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return; // No existe

    // Solo cerramos si está abierto
    if (modalEl.classList.contains('show')) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
    }
}
