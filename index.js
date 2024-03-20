const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

// Database configuration
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pkqync3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // all collections
    const reviewCollection = client.db("restaurantsDB").collection("reviews");
    const menuCollection = client.db("restaurantsDB").collection("menu");
    const cartsCollection = client.db("restaurantsDB").collection("carts");
    const userCollection = client.db("restaurantsDB").collection("users");

    // user collection

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user does not exist :
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // get menu data from the server
    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });

    app.get("/reviews", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cart = await cartsCollection.find(query).toArray();
      res.send(cart);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(" You successfully connected to MongoDB Boss Server!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("welcome to Boss Restaurants");
});

app.listen(port, () =>
  console.log(` Boss Restaurants Server is running on port ${port}`)
);
