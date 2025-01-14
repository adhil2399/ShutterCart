const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');
 
const orderSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true,
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        productName: {
            type: String,
            required: true,
        },
        productImage: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        }
    }],
    totalPrice: {
        type: Number,
        required: true,
    },
    discount: {
        bestOffer: {
            type: Number,
            default: 0
        },
        coupon: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        }
    },
    finalAmount: {
        type: Number,
        required: true,
    },
    address: {
        name: {
            type: String,
            required: true,
        },
        addressType: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        pinCode: {
            type: String,
            required: true,
        },
        landMark: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        altPhone: {
            type: String,
            required: false,
        },
    },
    status: {
        type: String,
        required: true,
        enum: [ 'Pending Payment', 'Placed', 'Rejected', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
    },
    paymentMethod: {  
        type: String,
        required: true,
        enum: ['COD', 'wallet', 'ONLINE'], 
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Paid', 'Unpaid', 'Refunded','Failed'],
        default: 'Unpaid',
    },
    couponApplied: {
        type: Boolean,
        default: false,
    },
    couponDetails:{
code:{
    type: String,
    required: false,
    default: null
},
    offerPrice: {
        type: Number,
        required: false,
        default: null
    },
    minimumPrice: {
        type: Number,
        required: false,
        default: null
    }
    },
    razorpayOrderId: {
        type: String,
        required: false,
        default: null
    },
    cancelOrder:{
        reason:{
            type: String,
             default: null
        },
        date: {
            type: Date,
            default: new Date
        },
    },
    returnRequest: {
        status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected',],
          default: null
        },
        reason: String,
        details: String,
        date: {
          type: Date,
          default: Date.now
        },
        processedDate: {
          type: Date,
          default: null
        }
      },
 

},{timestamps:true});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
