// compare table//
document.addEventListener("DOMContentLoaded", function() {
    const compareTable = document.querySelector(".table-compare");
    
    if (compareTable) {
        compareTable.addEventListener("click", function(e) {
            const clicked = e.target.closest(".remove");
            if (!clicked) return;
            
            const th = Array.from(clicked.closest("tr").children);
            const index = th.indexOf(clicked);
            const tableRows = compareTable.querySelectorAll("tbody tr");

            tableRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll("td"));
                if (cells.length > index) {
                    cells[index].style.display = "none";
                }
            });
            
            if (th.length > index) {
                th[index].style.display = "none";
            }
        });
    }
});
