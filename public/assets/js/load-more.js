const infiniteScroll = (wrapperEl, moreBtn, noMoreMsg) => {
    let items = document.querySelector(wrapperEl).children;
    let moreBtnDOM = document.querySelector(moreBtn);
    let noMoreMsgDOM = document.querySelector(noMoreMsg);
  
    let currentShowNum = 12;
    let lastShowNum = 0;
  
    const SHOW_NUM = 4;
  
    showItems();
  
    moreBtnDOM.addEventListener("click", () => {
      showItems();
    });
  
    function showItems() {
      for (let i = lastShowNum; i < currentShowNum; i++) {
        if (items[i]) {
          items[i].classList.add("show");
        } else {
          moreBtnDOM.style.display = "none";
          noMoreMsgDOM.style.display = "block";
          return;
        }
      }
  
      lastShowNum = currentShowNum;
      currentShowNum += SHOW_NUM;
    }
  };
  
  infiniteScroll("#load-more-list", "#load-more", "#no-more-products");