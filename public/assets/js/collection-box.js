
document.addEventListener('DOMContentLoaded', function() {
    const filterButton = document.querySelector('.filter-button');
    const backButton = document.querySelector('.back-button');
    const leftBox = document.querySelector('.left-box');
    const bgOverlay = document.querySelector('.bg-overlay');

    filterButton.addEventListener('click', function() {
        leftBox.classList.toggle('open');
        bgOverlay.classList.toggle('open', leftBox.classList.contains('open'));
    });

    backButton.addEventListener('click', function() {
        leftBox.classList.remove('open');
        bgOverlay.classList.remove('open');
    });
});