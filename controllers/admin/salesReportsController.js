const Order = require('../../models/orderSchema');  
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Controller to fetch sales reports
const getSalesReports = async (req, res) => {
    try {
        const { period, status, startDate, endDate } = req.query;

        // Build query filters
        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (period === 'custom' && startDate && endDate) {
            query.createdOn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Fetch orders from the database
        const orders = await Order.find(query).populate('userId'); // Assuming `userId` is a reference to the User model

        // Calculate totals
        const totals =  calculateTotals(orders);
     console.log(totals)
        // Calculate payment method stats
        const paymentStats = orders.reduce((acc, order) => {
            acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
            return acc;
        }, {});

        // Unique statuses for filter dropdown
        const uniqueStatuses = await Order.distinct('status');

        // Render sales reports view
        res.render('salesReports', {
            orders,
            totals,
            paymentStats,
            uniqueStatuses,
            period: period || 'daily',
            status: status || 'all',
            startDate: startDate || '',
            endDate: endDate || '',
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating sales report');
    }
};




const getDateFilter = (period, startDate, endDate) => {
    const now = new Date();
    let dateFilter = {};

    switch (period) {
        case 'daily':
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            dateFilter = {
                createdOn: {
                    $gte: today,
                    $lte: new Date(now)
                }
            };
            break;
        case 'weekly':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { createdOn: { $gte: weekAgo } };
            break;
        case 'monthly':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { createdOn: { $gte: monthAgo } };
            break;
        case 'yearly':
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter = { createdOn: { $gte: yearAgo } };
            break;
        case 'custom':
            if (startDate && endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                dateFilter = {
                    createdOn: {
                        $gte: new Date(startDate),
                        $lte: endDateTime
                    }
                };
            }
            break;
    }
    return dateFilter;
};


//calculate total orders.........................................

function calculateTotals(orders) {
    const allStatuses = [
        'Pending', 'Processing', 'Shipped', 
        'Delivered', 'Return Request', 
        'Returned', 'Cancelled'
    ];
    
    const totals = {
        totalPrice: 0,
        finalAmount: 0,
        discount: 0,
        count: 0,
    };

    // Initialize all status counts to 0
    allStatuses.forEach(status => {
        totals[`${status}Count`] = 0;
    });

    // Aggregate data
    orders.forEach(order => {
        totals.totalPrice += order.totalPrice;
        totals.finalAmount += order.finalAmount;
        totals.discount += order.totalPrice - order.finalAmount;
        totals.count += 1;
        const statusKey = `${order.status}Count`;
        if (totals[statusKey] !== undefined) {
            totals[statusKey] += 1;
        }
    });

    return totals;
}


 
const downloadReport = async (req, res) => {
    try {
        const { format, period, startDate, endDate } = req.query;
        const dateFilter = getDateFilter(period, startDate, endDate);

        const orders = await Order.find({
            ...dateFilter,
            status: { $nin: ['Pending', 'Processing'] }
        })
        .populate('userId', 'name')
        .populate('orderItems.product', 'name')
        .sort({ createdOn: -1 });

        const totals = calculateTotals(orders);

        if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
            
            doc.pipe(res);
            
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(14).text('Summary', { underline: true });
            doc.fontSize(12)
                .text(`Report Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`)
                .text(`Total Orders: ${totals.count}`)
                .text(`Total Amount: ₹${totals.orderAmount.toFixed(2)}`)
                .text(`Regular Discounts: ₹${totals.regularDiscount.toFixed(2)}`)
                .text(`Coupon Discounts: ₹${totals.couponDiscount.toFixed(2)}`)
                .text(`Final Amount: ₹${totals.finalAmount.toFixed(2)}`)
                .text(`Cancelled Orders: ${totals.cancelledCount}`)
                .text(`Returned Orders: ${totals.returnedCount}`);
            
            doc.moveDown();

            doc.fontSize(14).text('Order Details', { underline: true });
            doc.moveDown();

            const startX = 50;
            const columnWidth = 85;
            doc.fontSize(10);
            
            ['Order ID', 'Date', 'Customer', 'Items', 'Amount', 'Discount', 'Final', 'Status'].forEach((header, i) => {
                doc.text(header, startX + (i * columnWidth), doc.y, { width: columnWidth, align: 'left' });
            });

            doc.moveDown();

            orders.forEach(order => {
                const y = doc.y;
                if (y > 700) { 
                    doc.addPage();
                    doc.fontSize(10);
                }

                const date = new Date(order.createdOn).toLocaleDateString();
                const itemsCount = order.orderItems.length;

                doc.text(order.orderId.substring(0, 8), startX, doc.y, { width: columnWidth })
                   .text(date, startX + columnWidth, doc.y - 12, { width: columnWidth })
                   .text(order.userId?.name || 'N/A', startX + (columnWidth * 2), doc.y - 12, { width: columnWidth })
                   .text(itemsCount.toString(), startX + (columnWidth * 3), doc.y - 12, { width: columnWidth })
                   .text(`₹${order.totalPrice.toFixed(2)}`, startX + (columnWidth * 4), doc.y - 12, { width: columnWidth })
                   .text(`₹${(order.discount || 0).toFixed(2)}`, startX + (columnWidth * 5), doc.y - 12, { width: columnWidth })
                   .text(`₹${order.finalAmount.toFixed(2)}`, startX + (columnWidth * 6), doc.y - 12, { width: columnWidth })
                   .text(order.status, startX + (columnWidth * 7), doc.y - 12, { width: columnWidth });

                doc.moveDown();
            });

            doc.end();

        } else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            const headerStyle = {
                font: { bold: true },
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                }
            };

            worksheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Items', key: 'items', width: 40 },
                { header: 'Amount', key: 'amount', width: 15 },
                { header: 'Discount', key: 'discount', width: 15 },
                { header: 'Final Amount', key: 'final', width: 15 },
                { header: 'Status', key: 'status', width: 15 }
            ];

            worksheet.getRow(1).eachCell(cell => {
                cell.style = headerStyle;
            });

            orders.forEach(order => {
                const itemsList = order.orderItems
                    .map(item => `${item.product.name} (${item.quantity})`)
                    .join(', ');

                worksheet.addRow({
                    orderId: order.orderId,
                    date: new Date(order.createdOn).toLocaleDateString(),
                    customer: order.userId?.name || 'N/A',
                    items: itemsList,
                    amount: order.totalPrice,
                    discount: order.discount || 0,
                    final: order.finalAmount,
                    status: order.status
                });
            });

            worksheet.addRow([]);
            worksheet.addRow(['Summary']);
            worksheet.addRow(['Total Orders', totals.count]);
            worksheet.addRow(['Total Amount', totals.orderAmount]);
            worksheet.addRow(['Regular Discounts', totals.regularDiscount]);
            worksheet.addRow(['Coupon Discounts', totals.couponDiscount]);
            worksheet.addRow(['Final Amount', totals.finalAmount]);
            worksheet.addRow(['Cancelled Orders', totals.cancelledCount]);
            worksheet.addRow(['Returned Orders', totals.returnedCount]);

            worksheet.getColumn('amount').numFmt = '₹#,##0.00';
            worksheet.getColumn('discount').numFmt = '₹#,##0.00';
            worksheet.getColumn('final').numFmt = '₹#,##0.00';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

            await workbook.xlsx.write(res);
        }

    } catch (error) {
        console.error('Error in downloadReport:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};


 

module.exports = {
    getSalesReports,
    downloadReport,
};

