/*-----------------------------------------------------------------------------------

 Template Name:Katie
 Template URI: themes.pixelstrap.net/katie/template
 Description: This is a social website
 Author: Pixelstrap
 Author URI: https://themeforest.net/user/pixelstrap

 ----------------------------------------------------------------------------------- */



/*====================
       Ratio js
   =======================*/
window.addEventListener("load", () => {
    const bgImg = document.querySelectorAll(".bg-img");
    for (i = 0; i < bgImg.length; i++) {
        let bgImgEl = bgImg[i];

        if (bgImgEl.classList.contains("bg-top")) {
            bgImgEl.parentNode.classList.add("b-top");
        } else if (bgImgEl.classList.contains("bg-bottom")) {
            bgImgEl.parentNode.classList.add("b-bottom");
        } else if (bgImgEl.classList.contains("bg-center")) {
            bgImgEl.parentNode.classList.add("b-center");
        } else if (bgImgEl.classList.contains("bg-left")) {
            bgImgEl.parentNode.classList.add("b-left");
        } else if (bgImgEl.classList.contains("bg-right")) {
            bgImgEl.parentNode.classList.add("b-right");
        }

        if (bgImgEl.classList.contains("blur-up")) {
            bgImgEl.parentNode.classList.add("blur-up", "lazyload");
        }

        if (bgImgEl.classList.contains("bg_size_content")) {
            bgImgEl.parentNode.classList.add("b_size_content");
        }

        bgImgEl.parentNode.classList.add("bg-size");
        const bgSrc = bgImgEl.src;
        bgImgEl.style.display = "none";
        bgImgEl.parentNode.setAttribute(
            "style",
            `
        background-image: url(${bgSrc});
        background-size:cover;
        background-position: center;
        background-repeat: no-repeat;
        display: block;
        `
        );
    }
});


/*=====================
02.Tap to Top
==========================*/

window.addEventListener('scroll', function () {
    var tapTopElement = document.querySelector('.tap-top');
    if (window.scrollY > 600) {
        tapTopElement.classList.add('top');
    } else {
        tapTopElement.classList.remove('top');
    }
});

var tapTopElement = document.querySelector('.tap-top');
tapTopElement.addEventListener('click', function () {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    return false;
});
/*============================
    03.toggle nav
 ============================*/

    const toggleNav = document.getElementById('toggle-nav');
    const mobileBack = document.getElementById('mobile-back');
    const smHorizontal = document.getElementById('sm-horizontal');
    toggleNav.addEventListener('click', function() {
        smHorizontal.classList.add('open');
    });
    mobileBack.addEventListener('click', function() {
        smHorizontal.classList.remove('open');
    });

 
/*============================
        07.cart js 
============================*/

function initializeCounter(counterId, totalId, addBtnId, removeBtnId) {
    const quantityPrevious = document.querySelector(`#${counterId}-previous`);
    const quantityCurrent = document.querySelector(`#${counterId}-current`);
    const quantityNext = document.querySelector(`#${counterId}-next`);

    const total = document.querySelector(`#${totalId}`);

    const addBtn = document.querySelector(`#${addBtnId}`);
    const removeBtn = document.querySelector(`#${removeBtnId}`);

    quantityPrevious.innerHTML = 0;
    quantityCurrent.innerHTML = 1;
    quantityNext.innerHTML = 2;
    total.innerHTML = 35;

    addBtn.addEventListener("click", () => {
        total.innerHTML = parseInt(total.innerHTML) + 35;
        quantityCurrent.classList.add("added");
        quantityNext.classList.add("added");

        setTimeout(() => {
            quantityPrevious.innerHTML = parseInt(quantityPrevious.innerHTML) + 1;
            quantityCurrent.innerHTML = parseInt(quantityCurrent.innerHTML) + 1;
            quantityNext.innerHTML = parseInt(quantityNext.innerHTML) + 1;
            quantityCurrent.classList.remove("added");
            quantityNext.classList.remove("added");
        }, 500);
    });

    removeBtn.addEventListener("click", () => {
        if (parseInt(quantityCurrent.innerHTML) <= 0) {
            return null;
        }

        total.innerHTML = parseInt(total.innerHTML) - 35;
        quantityCurrent.classList.add("removed");
        quantityPrevious.classList.add("removed");

        setTimeout(() => {
            quantityPrevious.innerHTML = parseInt(quantityPrevious.innerHTML) - 1;
            quantityCurrent.innerHTML = parseInt(quantityCurrent.innerHTML) - 1;
            quantityNext.innerHTML = parseInt(quantityNext.innerHTML) - 1;
            quantityCurrent.classList.remove("removed");
            quantityPrevious.classList.remove("removed");
        }, 500);
    });
}

// Example usage:
initializeCounter("quantity", "total", "btn-add", "btn-remove");
initializeCounter("quantity1", "total1", "btn-add1", "btn-remove1");
initializeCounter("quantity2", "total2", "btn-add2", "btn-remove2");
initializeCounter("quantity3", "total3", "btn-add3", "btn-remove3");


/*============================
           05.Tost js 
   ============================*/

document.querySelectorAll(".wishlist-icon").forEach(function (element) {
    element.addEventListener("click", function () {
        Toastify({
            text: "Success! Item Successfully added in wishlist.!!",
            duration: 2500,
            close: true,
        }).showToast();
        i++;
    });
});


/*====================
       footer according
   =======================*/

const footerButton = document.querySelectorAll(".footer-content h5");
const showNav = document.querySelector(".nav");
for (var i = 0; i < footerButton.length; ++i) {
    footerButton[i].addEventListener('click', function () {
        this.parentNode.classList.toggle('open');
    })
}


/*====================
       title change 
   =======================*/
var title = document.title;

window.addEventListener('focus', function () {
    document.title = title;
});

window.addEventListener('blur', function () {
    document.title = "🎉 Come Back...";
});

/*====================
   other js 
=======================*/

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed");

    var sizeItems = document.querySelectorAll('.size-box ul li');
    console.log("sizeItems:", sizeItems);

    sizeItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            console.log("Clicked on size item:", this);

            sizeItems.forEach(function (sizeItem) {
                sizeItem.classList.remove('active');
            });

            var selectSize = document.getElementById('selectSize');
            console.log("selectSize:", selectSize);

            if (selectSize) {
                selectSize.classList.remove('cartMove');
            } else {
                console.log("Element with id 'selectSize' not found.");
            }

            this.classList.add('active');
            this.parentNode.classList.add('selected');
        });
    });
});

var colorItems = document.querySelectorAll('.color-variant li');
colorItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
        colorItems.forEach(function (colorItem) {
            colorItem.classList.remove('active');
        });
        this.classList.add('active');
    });
});


/*====================
       offcanvas cart 
   =======================*/
document.addEventListener('DOMContentLoaded', function () {
    var deleteIcons = document.querySelectorAll('.delete-icon');
    deleteIcons.forEach(function (icon) {
        icon.addEventListener('click', function () {
            var listItem = icon.closest('li');
            if (listItem) {
                listItem.remove();
            }
        });
    });
});


/*====================
       Wishlist card
   =======================*/
const wishlistProduct = document.querySelectorAll(".product-wishlist");
wishlistProduct.forEach(el => {
    const deleteButton = el.querySelector(".delete-button");
    deleteButton.addEventListener("click", function () {
        this.closest(".col").style.display = "none";
    });
});

  

/*====================
      Header responsive 
   =======================*/

document.addEventListener('DOMContentLoaded', () => {
    function handleNavClick(event) {
      const clickedElement = event.target.closest('li');
  
      if (clickedElement && !clickedElement.classList.contains('mobile-back')) {
        const isActive = clickedElement.classList.contains('show');
  
        // Remove 'show' class from all <li> elements
        document.querySelectorAll('#sm-horizontal li').forEach(li => {
          li.classList.remove('show');
          if (li.querySelector('.nav-link')) {
            li.querySelector('.nav-link').classList.remove('show');
          }
          if (li.querySelector('.mega-menu')) {
            li.querySelector('.mega-menu').classList.remove('show');
          }
          if (li.querySelector('.nav-submenu')) {
            li.querySelector('.nav-submenu').classList.remove('show');
          }
        });
  
        // If the clicked element didn't have the 'show' class, add it
        if (!isActive) {
          clickedElement.classList.add('show');
          if (clickedElement.querySelector('.nav-link')) {
            clickedElement.querySelector('.nav-link').classList.add('show');
          }
          if (clickedElement.querySelector('.mega-menu')) {
            clickedElement.querySelector('.mega-menu').classList.add('show');
          }
          if (clickedElement.querySelector('.nav-submenu')) {
            clickedElement.querySelector('.nav-submenu').classList.add('show');
          }
        }
      }
    }
  
    function handleResize() {
      if (window.innerWidth <= 1200) {
        document.getElementById('sm-horizontal').addEventListener('click', handleNavClick);
      } else {
        document.getElementById('sm-horizontal').removeEventListener('click', handleNavClick);
        // Remove 'show' class from all elements on resize above 1199px
        document.querySelectorAll('#sm-horizontal li').forEach(li => {
          li.classList.remove('show');
          if (li.querySelector('.nav-link')) {
            li.querySelector('.nav-link').classList.remove('show');
          }
          if (li.querySelector('.mega-menu')) {
            li.querySelector('.mega-menu').classList.remove('show');
          }
          if (li.querySelector('.nav-submenu')) {
            li.querySelector('.nav-submenu').classList.remove('show');
          }
        });
      }
    }
  
    // Initial check
    handleResize();
  
    // Attach resize event listener
    window.addEventListener('resize', handleResize);
  });