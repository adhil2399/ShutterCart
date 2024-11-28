
const gridStyleParent = document.querySelector(".filter-option-grid");
const visibleEl = document.querySelector(".view-option");

if (gridStyleParent) {

    if (window.innerWidth <= 991) {
        document.querySelector(`.nav-link[data-grid="3"]`).classList.add("active");

    }
    if (window.innerWidth <= 767) {
        document.querySelector(`.nav-link[data-grid="2"]`).classList.add("active");
        visibleEl.className = [`row-cols-2 grid-section view-option row g-3 g-xl-4 ratio_asos`];

    }

    gridStyleParent?.addEventListener("click", function (e) {
        e.preventDefault();
        const clicked = e.target.closest(".nav-link");
        if (!clicked) return;

        gridStyleParent.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"))
        clicked.classList.add("active");
        if (clicked.dataset.grid === "2") {
            visibleEl.className = [`row-cols-${clicked.dataset.grid} grid-section view-option row g-3 g-xl-4 ratio_asos`]
        } else if (clicked.dataset.grid === "3") {
            visibleEl.className = [`row-cols-2 row-cols-sm-${clicked.dataset.grid} grid-section view-option row g-3 g-xl-4 ratio_asos`]
        } else if (clicked.dataset.grid === "4") {
            visibleEl.className = [`row-cols-2 row-cols-sm-3 row-cols-xl-${clicked.dataset.grid} grid-section view-option row g-3 g-xl-4 ratio_asos`]
        } else if (clicked.dataset.grid === "list") {
            visibleEl.className = [`list-section view-option row g-3 g-xl-4 ratio_asos`]
        }
    });

}
