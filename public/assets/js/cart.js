// table remove js 
document.addEventListener("DOMContentLoaded", function() {
    const clearAllButton = document.getElementById('clearAllButton');
    const dataTable = document.getElementById('cart-table');
    const noDataDiv = document.getElementById('data-show');
    const cartTitle = document.getElementById('cartTitle');

    clearAllButton.addEventListener('click', function() {
        const dataTableBody = dataTable.getElementsByTagName('tbody')[0];
        while (dataTableBody.rows.length > 0) {
            dataTableBody.deleteRow(0);
        }
        dataTable.remove();
        noDataDiv.style.display = 'block';
        noDataDiv.style.textAlign = 'center';
        noDataDiv.style.paddingTop = 'calc(20px + (100 - 20) * ((100vw - 320px) / (1920 - 320)))';
        cartTitle.textContent = '(0)';
    });
});
document.querySelectorAll(".deleteButton").forEach(button => {
    button.addEventListener("click", function() {
        var row = this.closest("tr");
        if (row) {
            row.parentNode.removeChild(row);
            updateCartCount();
        }
    });
});

function updateCartCount() {
    var rowCount = document.querySelectorAll("#cart-table tbody tr").length;
    var cartTitle = document.getElementById("cartTitle");
    if (cartTitle) {
        cartTitle.textContent = "(" + rowCount + ")";
    }
}
