/* =============
    dashboard left sidebar 
    =====================*/
    document.querySelector('.left-dashboard-show').addEventListener('click', function() {
        document.querySelector('.dashboard-left-sidebar').classList.add('open');
    });

    document.querySelector('.dashboard-left-sidebar-close').addEventListener('click', function() {
        document.querySelector('.dashboard-left-sidebar').classList.remove('open');
    });