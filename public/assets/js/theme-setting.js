/*===================
18. Theme Setting js
=======================*/
const themeBtnParent = document.querySelector(".theme-btns");

const rtlBtn = document.querySelector("#rtl-btn");
const darkBtn = document.querySelector("#dark-btn");
const html = document.querySelector("html");
const body = document.querySelector("body");
const rtlLink = document.querySelector("#rtl-link");

themeBtnParent?.addEventListener("click", function (e) {
    e.preventDefault();
    const clicked = e.target.closest(".btntheme")?.id;
    if (!clicked) return;
    if (clicked === "rtl-btn") {
        rtlBtn.id = "ltr-btn";
        rtlBtn.querySelector(".rtl").textContent = "Ltr";
        html.setAttribute("dir", "rtl");
        rtlLink.href = "../assets/css/vendors/bootstrap.rtl.css";
        rtlBtn.classList.add("rtlBtnEl");
        localStorage.setItem('rtlcss', '../assets/css/vendors/bootstrap.rtl.css');
        localStorage.setItem('dir', 'rtl');
        localStorage.setItem('rtlBtnId', 'ltr-btn');
        localStorage.setItem('textContentRtl', 'Ltr');
    }
    if (clicked === "ltr-btn") {
        rtlBtn.id = "rtl-btn";
        rtlBtn.querySelector(".rtl").textContent = "Rtl";
        html.setAttribute("dir", "");
        rtlLink.href = "../assets/css/vendors/bootstrap.css";
        localStorage.setItem('rtlcss', '../assets/css/vendors/bootstrap.css');
        localStorage.setItem('dir', '');
        localStorage.setItem('rtlBtnId', 'rtl-btn');
        localStorage.setItem('textContentRtl', 'Rtl');
    }
    if (clicked === "dark-btn") {
        darkBtn.id = "light-btn";
        darkBtn.innerHTML = `<i class="fa-solid fa-sun"></i> <div class="dark">Light</div>`;
        body.classList.add("dark");
        localStorage.setItem("body", "dark");
        localStorage.setItem('darkId', 'light-btn');
        localStorage.setItem('textContentDark', `<i class="fa-solid fa-sun"></i> <div class="dark">Light</div>`);
    }
    if (clicked === "light-btn") {
        darkBtn.id = "dark-btn";
        darkBtn.innerHTML = `<i class="fa-regular fa-moon"></i> <div class="dark">Dark</div>`;
        body.classList.remove("dark");
        localStorage.setItem("body", "");
        localStorage.setItem('darkId', 'dark-btn');
        localStorage.setItem('textContentDark', `<i class="fa-regular fa-moon"></i> <div class="dark">Dark</div>`);
    }
});

// Rtl 
rtlBtn.id = localStorage.getItem("rtlBtnId") ? localStorage.getItem("rtlBtnId") : "rtl-btn";
rtlBtn.querySelector(".rtl").textContent = localStorage.getItem("textContentRtl") ? localStorage.getItem("textContentRtl") : "Rtl";
html.setAttribute("dir", localStorage.getItem("dir"));
rtlLink.href = localStorage.getItem('rtlcss') ? localStorage.getItem('rtlcss') : '../assets/css/vendors/bootstrap.css';

// Dark 
darkBtn.id = localStorage.getItem("darkId") ? localStorage.getItem("darkId") : "dark-btn";
darkBtn.innerHTML = localStorage.getItem("textContentDark") ? localStorage.getItem("textContentDark") : `<i class="fa-regular fa-moon"></i> <div class="dark">Dark</div>`;
if (localStorage.getItem("body") === "dark") {
    body.classList.add("dark");
}

/// Bootstrap Tool Tip ///
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});