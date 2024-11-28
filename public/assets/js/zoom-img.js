// function zoom(e){
//     var zoomer = e.currentTarget;
//     e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX
//     e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX
//     x = offsetX/zoomer.offsetWidth*100
//     y = offsetY/zoomer.offsetHeight*100
//     zoomer.style.backgroundPosition = x + '% ' + y + '%';
// }

// function zoom(e) {
//     var zoomer = e.currentTarget;
//     var offsetX, offsetY;

//     if (e.offsetX !== undefined && e.offsetY !== undefined) {
//         offsetX = e.offsetX;
//         offsetY = e.offsetY;
//     } else {
//         offsetX = e.touches[0].pageX - e.target.getBoundingClientRect().left;
//         offsetY = e.touches[0].pageY - e.target.getBoundingClientRect().top;
//     }

//     var x = offsetX / zoomer.offsetWidth * 100;
//     var y = offsetY / zoomer.offsetHeight * 100;

//     zoomer.style.backgroundPosition = x + '% ' + y + '%';
// }
function zoom(e){
    var zoomer = e.currentTarget;
    e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX
    e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX
    x = offsetX/zoomer.offsetWidth*100
    y = offsetY/zoomer.offsetHeight*100
    zoomer.style.backgroundPosition = x + '% ' + y + '%';
  }