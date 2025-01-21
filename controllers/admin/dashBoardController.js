const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            const timeFrame = req.query.timeFrame || 'daily';
            console.log('Selected timeFrame:', timeFrame);

            // Get total sales
            let totalSales = await Order.aggregate([
                { $match: { status: 'Delivered' } },
                { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
            ]);
            
            totalSales = totalSales.length > 0 ? totalSales[0].totalSales : 0;
            const totalUsers = await User.find().countDocuments();
            const totalOrders = await Order.find().countDocuments();
            const totalProducts = await Product.find().countDocuments();

            console.log('Total Stats:', { totalSales, totalUsers, totalOrders, totalProducts });

            // Calculate date range based on timeFrame
            const endDate = new Date();
            const startDate = new Date();

            switch(timeFrame) {
                case 'yearly':
                    startDate.setFullYear(startDate.getFullYear() - 5);
                    break;
                case 'monthly':
                    startDate.setMonth(startDate.getMonth() - 11); // Last 12 months
                    break;
                case 'weekly':
                    startDate.setDate(startDate.getDate() - 90);
                    break;
                default: // daily
                    startDate.setDate(startDate.getDate() - 30);
            }

            console.log('Date Range:', { startDate, endDate });

            // Get sales data with proper date grouping
            let salesData = await Order.aggregate([
                {
                    $match: {
                        status: 'Delivered',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' },
                            week: { 
                                $week: {
                                    date: '$createdAt',
                                    timezone: 'Asia/Kolkata'
                                }
                            }
                        },
                        amount: { $sum: '$totalPrice' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateToString: {
                                date: {
                                    $dateFromParts: {
                                        year: '$_id.year',
                                        month: timeFrame === 'yearly' ? 1 : '$_id.month',
                                        day: timeFrame === 'monthly' || timeFrame === 'yearly' ? 1 : 
                                             timeFrame === 'weekly' ? { $add: [{ $multiply: ['$_id.week', 7] }, 1] } : '$_id.day'
                                    }
                                },
                                format: '%Y-%m-%d'
                            }
                        },
                        amount: 1,
                        week: '$_id.week'
                    }
                }
            ]);

            if (timeFrame === 'weekly') {
                // Group by week number
                const weeklyData = {};
                salesData.forEach(item => {
                    const date = new Date(item.date);
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                    const weekKey = weekStart.toISOString().slice(0, 10);
                    
                    if (!weeklyData[weekKey]) {
                        weeklyData[weekKey] = 0;
                    }
                    weeklyData[weekKey] += item.amount;
                });

                // Convert to array and sort
                const weeklySalesData = Object.entries(weeklyData).map(([date, amount]) => ({
                    date,
                    amount
                })).sort((a, b) => a.date.localeCompare(b.date));

                // Fill in missing weeks
                const filledSalesData = [];
                let currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

                while (currentDate <= endDate) {
                    const weekKey = currentDate.toISOString().slice(0, 10);
                    const existingData = weeklySalesData.find(item => item.date === weekKey);
                    
                    filledSalesData.push({
                        date: weekKey,
                        amount: existingData ? existingData.amount : 0
                    });

                    currentDate.setDate(currentDate.getDate() + 7); // Move to next week
                }

                salesData = filledSalesData;
            } else {
                // For other time frames, fill in missing dates
                const filledSalesData = [];
                let currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    let dateKey;
                    switch(timeFrame) {
                        case 'yearly':
                            dateKey = currentDate.toISOString().slice(0, 4) + '-01-01';
                            currentDate.setFullYear(currentDate.getFullYear() + 1);
                            break;
                        case 'monthly':
                            dateKey = currentDate.toISOString().slice(0, 7) + '-01';
                            currentDate.setMonth(currentDate.getMonth() + 1);
                            break;
                        default: // daily
                            dateKey = currentDate.toISOString().slice(0, 10);
                            currentDate.setDate(currentDate.getDate() + 1);
                    }

                    const existingData = salesData.find(item => item.date.startsWith(dateKey));
                    filledSalesData.push({
                        date: dateKey,
                        amount: existingData ? existingData.amount : 0
                    });
                }

                salesData = filledSalesData;
            }

            console.log('Filled Sales Data:', salesData);

            // Get category distribution data
            const categoryData = await Product.aggregate([
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                { $unwind: '$categoryInfo' },
                {
                    $group: {
                        _id: '$categoryInfo._id',
                        name: { $first: '$categoryInfo.name' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: 1,
                        count: 1
                    }
                }
            ]);

            console.log('Category Data:', categoryData);

            // Get top products data
            const topProducts = await Order.aggregate([
                { $match: { status: 'Delivered' } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        sales: { $sum: '$items.quantity' }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                { $unwind: '$productInfo' },
                {
                    $project: {
                        _id: 0,
                        name: '$productInfo.name',
                        sales: 1
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            console.log('Top Products:', topProducts);

            res.render('dashBoard', { 
                totalSales, 
                totalOrders, 
                totalUsers, 
                totalProducts,
                salesData,
                categoryData,
                topProducts,
                timeFrame,
                admin: true
            });
        } else {
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.redirect('/admin/pageerror');
    }
};

const getTopCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.category',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    name: '$categoryInfo.name',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.json(topCategories);
    } catch (error) {
        console.error('Error getting top categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTopBrands = async (req, res) => {
    try {
        const topBrands = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.brand',
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $lookup: {
                    from: 'brands',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'brandInfo'
                }
            },
            { $unwind: '$brandInfo' },
            {
                $project: {
                    name: '$brandInfo.name',
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.json(topBrands);
    } catch (error) {
        console.error('Error getting top brands:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getLedgerData = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Delivered' })
            .sort({ orderDate: -1 })
            .limit(10)
            .lean();

        const ledgerData = orders.map(order => {
            let formattedDate;
            try {
                formattedDate = order.orderDate ? 
                    new Date(order.orderDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }) : 
                    new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
            } catch (err) {
                console.error('Error formatting date:', err);
                formattedDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }

            return {
                date: formattedDate,
                transactionId: order._id.toString(),
                description: 'Order Payment',
                debit: '0.00',
                credit: (order.totalPrice || 0).toFixed(2),
                balance: (order.totalPrice || 0).toFixed(2)
            };
        });

        res.json(ledgerData);
    } catch (error) {
        console.error('Error getting ledger data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getSalesData = async (req, res) => {
    try {
        const { timeFrame } = req.query;
        const currentDate = new Date();
        let startDate;
        let groupBy;
        let dateFormat;

        switch (timeFrame) {
            case 'yearly':
                startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth());
                groupBy = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' }
                };
                dateFormat = '%Y-%m';
                break;
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
                groupBy = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' },
                    day: { $dayOfMonth: '$orderDate' }
                };
                dateFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                groupBy = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' },
                    day: { $dayOfMonth: '$orderDate' }
                };
                dateFormat = '%Y-%m-%d';
                break;
            case 'daily':
                startDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
                groupBy = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' },
                    day: { $dayOfMonth: '$orderDate' },
                    hour: { $hour: '$orderDate' }
                };
                dateFormat = '%Y-%m-%d %H:00';
                break;
            default:
                startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth());
                groupBy = {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' }
                };
                dateFormat = '%Y-%m';
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: startDate },
                    status: 'Delivered'
                }
            },
            {
                $group: {
                    _id: groupBy,
                    totalSales: { $sum: '$totalPrice' }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    "_id.day": 1,
                    "_id.hour": 1
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: dateFormat,
                            date: {
                                $dateFromParts: {
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    day: { $ifNull: ["$_id.day", 1] },
                                    hour: { $ifNull: ["$_id.hour", 0] }
                                }
                            }
                        }
                    },
                    totalSales: 1
                }
            }
        ]);

        // If no data, return empty array with current timeframe
        if (salesData.length === 0) {
            const emptyData = [];
            switch (timeFrame) {
                case 'yearly':
                    for (let i = 0; i < 12; i++) {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11 + i);
                        emptyData.push({
                            date: date.toISOString().slice(0, 7),
                            totalSales: 0
                        });
                    }
                    break;
                case 'monthly':
                    for (let i = 0; i < 30; i++) {
                        const date = new Date(currentDate.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
                        emptyData.push({
                            date: date.toISOString().slice(0, 10),
                            totalSales: 0
                        });
                    }
                    break;
                case 'weekly':
                    for (let i = 0; i < 7; i++) {
                        const date = new Date(currentDate.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                        emptyData.push({
                            date: date.toISOString().slice(0, 10),
                            totalSales: 0
                        });
                    }
                    break;
                case 'daily':
                    for (let i = 0; i < 24; i++) {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), i);
                        emptyData.push({
                            date: `${date.toISOString().slice(0, 10)} ${String(i).padStart(2, '0')}:00`,
                            totalSales: 0
                        });
                    }
                    break;
            }
            return res.json(emptyData);
        }

        res.json(salesData);
    } catch (error) {
        console.error('Error getting sales data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCategoryDistribution = async (req, res) => {
    try {
        const categoryData = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    categoryName: '$categoryInfo.name',
                    count: 1
                }
            }
        ]);

        res.json(categoryData);
    } catch (error) {
        console.error('Error getting category distribution:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $project: {
                    name: '$productInfo.name',
                    totalRevenue: 1
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.json(topProducts);
    } catch (error) {
        console.error('Error getting top products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getDashboardData = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const timeFrame = req.query.timeFrame || 'daily';

        // Get total sales
        let totalSales = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } }
        ]);
        
        totalSales = totalSales.length > 0 ? totalSales[0].totalSales : 0;
        const totalUsers = await User.find().countDocuments();
        const totalOrders = await Order.find().countDocuments();
        const totalProducts = await Product.find().countDocuments();

        // Calculate date range based on timeFrame
        const endDate = new Date();
        const startDate = new Date();

        switch(timeFrame) {
            case 'yearly':
                startDate.setFullYear(startDate.getFullYear() - 5);
                break;
            case 'monthly':
                startDate.setMonth(startDate.getMonth() - 11); // Last 12 months
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - 90);
                break;
            default: // daily
                startDate.setDate(startDate.getDate() - 30);
        }

        // Get sales data with proper date grouping
        let salesData = await Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                        week: { 
                            $week: {
                                date: '$createdAt',
                                timezone: 'Asia/Kolkata'
                            }
                        }
                    },
                    amount: { $sum: '$totalPrice' }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            date: {
                                $dateFromParts: {
                                    year: '$_id.year',
                                    month: timeFrame === 'yearly' ? 1 : '$_id.month',
                                    day: timeFrame === 'monthly' || timeFrame === 'yearly' ? 1 : 
                                         timeFrame === 'weekly' ? { $add: [{ $multiply: ['$_id.week', 7] }, 1] } : '$_id.day'
                                }
                            },
                            format: '%Y-%m-%d'
                        }
                    },
                    amount: 1,
                    week: '$_id.week'
                }
            }
        ]);

        if (timeFrame === 'weekly') {
            // Group by week number
            const weeklyData = {};
            salesData.forEach(item => {
                const date = new Date(item.date);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                const weekKey = weekStart.toISOString().slice(0, 10);
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += item.amount;
            });

            // Convert to array and sort
            const weeklySalesData = Object.entries(weeklyData).map(([date, amount]) => ({
                date,
                amount
            })).sort((a, b) => a.date.localeCompare(b.date));

            // Fill in missing weeks
            const filledSalesData = [];
            let currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

            while (currentDate <= endDate) {
                const weekKey = currentDate.toISOString().slice(0, 10);
                const existingData = weeklySalesData.find(item => item.date === weekKey);
                
                filledSalesData.push({
                    date: weekKey,
                    amount: existingData ? existingData.amount : 0
                });

                currentDate.setDate(currentDate.getDate() + 7); // Move to next week
            }

            salesData = filledSalesData;
        } else {
            // For other time frames, fill in missing dates
            const filledSalesData = [];
            let currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                let dateKey;
                switch(timeFrame) {
                    case 'yearly':
                        dateKey = currentDate.toISOString().slice(0, 4) + '-01-01';
                        currentDate.setFullYear(currentDate.getFullYear() + 1);
                        break;
                    case 'monthly':
                        dateKey = currentDate.toISOString().slice(0, 7) + '-01';
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        break;
                    default: // daily
                        dateKey = currentDate.toISOString().slice(0, 10);
                        currentDate.setDate(currentDate.getDate() + 1);
                }

                const existingData = salesData.find(item => item.date.startsWith(dateKey));
                filledSalesData.push({
                    date: dateKey,
                    amount: existingData ? existingData.amount : 0
                });
            }

            salesData = filledSalesData;
        }

        // Get category distribution data
        const categoryData = await Product.aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    name: { $first: '$categoryInfo.name' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    count: 1
                }
            }
        ]);

        // Get top products data
        const topProducts = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    sales: { $sum: '$items.quantity' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $project: {
                    _id: 0,
                    name: '$productInfo.name',
                    sales: 1
                }
            },
            { $sort: { sales: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            totalSales,
            totalOrders,
            totalUsers,
            totalProducts,
            salesData,
            categoryData,
            topProducts
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    loadDashboard,
    getDashboardData,
    getTopCategories,
    getTopBrands,
    getTopProducts,
    getLedgerData,
    getSalesData,
    getCategoryDistribution
};