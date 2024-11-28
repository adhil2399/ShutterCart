/*=====================
  Plus Minus Item Js 
==========================*/
const plusMinus = document.querySelectorAll('.quantity');
plusMinus.forEach((element) => {
    const addButton = element.querySelector('.plus');
    const subButton = element.querySelector('.minus');
    addButton?.addEventListener('click', function () {
        const inputEl = this.parentNode.querySelector("input[type='number']");
        if (inputEl.value < 20) {
            inputEl.value = Number(inputEl.value) + 1;
        }
    });
    subButton?.addEventListener('click', function () {  
        const inputEl = this.parentNode.querySelector("input[type='number']");
        if (inputEl.value >= 2) {
            inputEl.value = Number(inputEl.value) - 1;
        }
    });
});