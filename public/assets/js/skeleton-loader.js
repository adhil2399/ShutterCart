function handleModalOpen() {
    if (document.body.classList.contains('modal-open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}
const observer = new MutationObserver(handleModalOpen);

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
});
setTimeout(() => {
    const loader = document.querySelector(".skeleton_loader");
    if (loader) {
        loader.style.display = "none";
    }
    handleModalOpen();
}, 1500);
handleModalOpen();
