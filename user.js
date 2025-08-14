const { MongoClient } = require('mongodb');
const express = require('express')
const bodyparser = require('body-parser')
const dotenv = require('dotenv')
const cors = require('cors')
const path = require('path'); // ✅ ADD THIS LINE
dotenv.config()

// Connection URL
const url = 'mongodb://localhost:27017/';
const client = new MongoClient(url);

// Database Name
const dbName = 'Ecommerce';
const app = express()
const port = 3000
app.use(bodyparser.json())
app.use(cors({
    origin: '*', // You can replace with frontend ngrok URL for more security
    credentials: true,
}));
async function connectToMongo() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB!");

        // Start server only after connection
        app.listen(3000, () => {
            console.log("🚀 Server running on port 3000");
        });

    } catch (e) {
        console.error("❌ Failed to connect to MongoDB:", e);
        process.exit(1);
    }
}

connectToMongo();
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));



// ✅ This route returns the full user object by username
app.get('/api/user/profile/:username', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { username } = req.params;
    console.log("Fetching user profile for:", username);
    try {
        const user = await collection.findOne({ Username: username });
        console.log("Full user data in user profile ", user);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const userProfileToSend = {
            _id: user._id ? user._id.toString() : null,
            Username: user.Username || "",
            Name: user.Name || "",
            Email: user.Email || "",
            Gender: user.Gender || "",
            Address: user.Address || "",
            Phone_Number: user.Phone_Number || "",
            id: user.id || "",
            addToCart: user.addToCart || [],
            Orders: user.Orders || []
        };
        console.log("after filtering user data in profile", userProfileToSend)
        res.json(userProfileToSend); //

    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.get('/', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const findResult = await collection.find({}).toArray();
    console.log('Found documents =>', findResult);
    res.json(findResult)
})
app.post('/', async (req, res) => {
    const userdata = req.body
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const findResult = await collection.insertOne(userdata);
    res.send({ success: true, result: findResult })
})

app.post("/add-To-Cart", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const { username, productId, name, price, productImg, quantity } = req.body;
    const cartItem = { productId, name, price, productImg, quantity };
    const result = await collection.updateOne(
        { Username: username },
        { $push: { addToCart: cartItem } }
    );
    if (result.modifiedCount > 0) {
        return res.json({ message: "Item added to cart", success: true });
    } else {
        return res.json({ message: "User not found", success: false });
    }

});

app.get("/CartPage/:Username", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const user = await collection.findOne({ Username: req.params.Username });
    if (user) {
        return res.json(user.addToCart);
    } else {
        return res.status(404).json({ message: "User not found" });
    }
});
app.post("/remove-From-Cart", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const { username, productId } = req.body;
    const result = await collection.updateOne(
        { Username: username },
        { $pull: { addToCart: { productId: productId } } }
    );
    if (result.modifiedCount > 0) {
        return res.json({ message: "Item removed from cart", success: true });
    } else {
        return res.json({ message: "Item not found in cart", success: false });
    }
});



app.post("/EmptyCart", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const { username } = req.body;
    const result = await collection.updateOne(
        { Username: username },
        { $set: { addToCart: [] } }
    );
    if (result.modifiedCount > 0) {
        return res.json({ message: "Cart Is Empty", success: true });
    } else {
        return res.json({ message: "Error during Emptying the Cart", success: false });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const db = client.db(dbName);
    const collection = db.collection('Userdata');

    try {
        const user = await collection.findOne({ Email: email, Password: password });

        if (user) {
            console.log("Full user object from MongoDB (before processing):", user); // Debugging line

            // ✅ user._id को string में बदलें
            // ✅ user ऑब्जेक्ट से केवल आवश्यक फ़ील्ड्स को एक नए ऑब्जेक्ट में मैप करें
            const userToSend = {
                _id: user._id.toString(), // ObjectId को string में बदलें
                Username: user.Username,
                Name: user.Name,
                Email: user.Email,
                // Password: user.Password, // ❌ सुरक्षा कारणों से पासवर्ड न भेजें
                Gender: user.Gender,
                Address: user.Address,       // यह एक array है, सीधे भेजें
                Phone_Number: user.Phone_Number,
                id: user.id,                 // यह एक string id है, सीधे भेजें
                addToCart: user.addToCart,   // यह एक array है, सीधे भेजें
                Orders: user.Orders          // यह एक array है, सीधे भेजें
            };

            const dataToSend = { success: true, user: userToSend };

            // ✅ सबसे महत्वपूर्ण बदलाव: res.json() को सीधे JavaScript ऑब्जेक्ट पास करें
            // इसे मैन्युअल रूप से JSON.stringify() न करें
            console.log("Login success response (object to be sent as JSON):", dataToSend);
            return res.json(dataToSend); // Express इसे अपने आप JSON stringify करेगा
        } else {
            // गलत क्रेडेंशियल के लिए
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        // किसी भी सर्वर-साइड त्रुटि को पकड़ें
        console.error("Error during login request:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post('/signup', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { Username, Name, Email, Password, Gender, Address, Phone_Number, id, addToCart, Orders } = req.body;
    const Usersdata = { Username, Name, Email, Password, Gender, Address, Phone_Number, id, addToCart, Orders };
    console.log("Usersdata in js", Usersdata)
    const user = await collection.findOne({ Email: Email });
    if (user) {
        console.log("This email already exist!!!")
        return res.send({ success: false, message: "Email already exists" });
    } else {
        const result = await collection.insertOne(Usersdata);
        console.log("result", result)
        return res.send({ success: true, message: "Signup successful", data: result });
    }
});

app.post('/my-profile', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { Username, Name, Email, Password, id, addToCart } = req.body;
    const Usersdata = { Username, Name, Email, Password, id, addToCart };
    console.log(Usersdata)
    const user = await collection.findOne({ Email: Email });
    if (user) {
        console.log("This email already exist!!!")
        return res.send({ success: false, message: "Email already exists" });
    } else {
        const result = await collection.insertOne(Usersdata);
        console.log("result", result)
        return res.send({ success: true, message: "Signup successful", data: result });
    }
});

// request for data to order
app.post("/Order", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const { username, OrderId, Address, TotalAmount, ProductData, Name, Email, Phone_number, BaseAmount, CashHandlingCharge, DeliveryCharge, Tax, DeliveredDate, OrderedDate, CancelledDate, OrderStatus } = req.body;
    const order = { OrderId, Address, TotalAmount, ProductData, Name, Email, Phone_number, BaseAmount, CashHandlingCharge, DeliveryCharge, Tax, DeliveredDate, OrderedDate, CancelledDate, OrderStatus };
    const result = await collection.updateOne(
        { Username: username },
        { $push: { Orders: order } }
    );
    if (result.modifiedCount > 0) {
        return res.json({ message: "Item added to cart", success: true });
    } else {
        return res.json({ message: "User not found", success: false });
    }
});



app.post("/CancelOrder", async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection("Userdata");

        const { username, OrderId, CancelDate } = req.body;

        const result = await collection.updateOne(
            {
                Username: username,
                "Orders.OrderId": OrderId
            },
            {
                $set: {
                    "Orders.$.OrderStatus": "Cancelled",
                    "Orders.$.CancelledDate": CancelDate
                }
            }
        );

        if (result.modifiedCount > 0) {
            return res.json({ message: "Order cancelled successfully", success: true });
        } else {
            return res.json({ message: "Order not found or already cancelled", success: false });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
});


// request for orders from database 
app.get("/Order/:Username", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection("Userdata");
    const user = await collection.findOne({ Username: req.params.Username });
    if (user) {
        return res.json(user.addToCart);
    } else {
        return res.status(404).json({ message: "User not found" });
    }
});

// update profile of a user 
app.post("/updateprofile", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { Name, Email, Gender, Phone_Number, OldEmail } = req.body;

    // Make sure the required fields are not empty
    if (!Email || !Name || !Phone_Number) {
        return res.send({ success: false, message: "All fields are required!" });
    }

    // If the email is being updated, check if the new email already exists in the database
    let emailExists = false;
    if (Email !== OldEmail) {  // Check if the email is different from the old one
        const emailCheck = await collection.findOne({ Email: Email });
        if (emailCheck) {
            emailExists = true;  // Set emailExists to true if the email already exists
        }
    }

    // If the email is already in use, return an error
    if (emailExists) {
        return res.send({ success: false, message: "This email already exists!" });
    }

    // Update the user profile (including Email, Gender, Name, Phone_Number)
    const result = await collection.updateOne(
        { Email: OldEmail }, // Use the old email to find the user
        {
            $set: {
                Name,
                Gender,
                Phone_Number,
                Email, // Update email only if it's changed
            },
        }
    );

    if (result.modifiedCount > 0) {
        console.log(result)
        return res.send({ success: true, message: "Profile updated successfully" });
    } else {
        return res.send({ success: false, message: "No changes detected or user not found" });
    }
});

app.post("/AddAddress", async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { id, Name, Email, Phone_number, PIN_Code, Locality, Address, City, State, Landmark, Alternate_Phone_Number, Address_Type } = req.body;
    const address = { id, Name, Email, Phone_number, PIN_Code, Locality, Address, City, State, Landmark, Alternate_Phone_Number, Address_Type };

    // Update the user profile (including Email, Gender, Name, Phone_Number)

    const result = await collection.updateOne(
        { Email: Email },
        { $push: { Address: address } }
    );
    if (result.modifiedCount > 0) {
        return res.send({ success: true, message: "Address Added Successfully" });
    } else {
        return res.send({ success: false, message: "Error Occured" });
    }
});
console.log("Hello Welcome To Flipkart Website!!!")
// DELETE /api/address/:id
app.delete('/api/address/:id', async (req, res) => {
    const { id } = req.params;
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    try {
        const result = await collection.updateOne(
            { "Address.id": id },
            { $pull: { Address: { id: id } } }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "Address not found" });
        }
        res.status(200).json({ message: "Address deleted successfully" });
    } catch (err) {
        console.error("Error while deleting address:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Express.js example
app.put('/EditAddress/:id', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { id } = req.params;
    const updatedData = req.body;
    try {
        const result = await collection.updateOne(
            { "Address.id": id },
            { $set: { "Address.$": updatedData } }
        )
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Address not found" });
        }
        res.status(200).json({ message: "Address updated successfully" });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Error updating address", error });
    }
});
app.post('/checkout', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('Userdata');
    const { username, cart } = req.body;

    try {
        for (const item of cart) {
            const result = await collection.updateOne(
                {
                    Username: username,                       // ✅ your document key
                    "addToCart.productId": item.productId     // ✅ match by number
                },
                {
                    $set: {
                        "addToCart.$.quantity": item.quantity   // ✅ update quantity
                    }
                }
            );

            console.log(`productId: ${item.productId}, quantity: ${item.quantity}`);
            console.log("Matched:", result.matchedCount, "Modified:", result.modifiedCount);
        }

        res.status(200).json({ message: "Cart updated successfully" });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Error updating address", error });
    }
});


app.all('*', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});
app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`);
});