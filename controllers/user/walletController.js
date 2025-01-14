const Wallet = require('../../models/walletSchema'); 

 const addMoney = async  (req, res) =>{

    const { amount } = req.body; 
    const userId = req.session.user;


    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount.' });
    }

    try {
         const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
  const  newWallet = new Wallet({
            userId,
            totalBalance: amount,
            transactions: [
                {
                    type: 'Deposit',
                    amount: amount,
                    status: 'Completed',
                    description: 'Added money to wallet',
                    date: new Date()
                }
            ]
        });

        await newWallet.save(); 
        }else{

         wallet.totalBalance += amount;

         wallet.transactions.push({
            type: 'Deposit',
            amount: amount,
            status: 'Completed',
            description: 'Added money to wallet',
            date: new Date()
        });

         await wallet.save();
    }

         res.json({
            message: 'Money added successfully!',
            totalBalance: wallet.totalBalance,
            transactions: wallet.transactions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}

 module.exports = {
    addMoney,
 };