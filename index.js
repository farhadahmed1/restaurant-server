const express = require("express");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
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

    // jwt authentication
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // insert
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // middleware
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin after  authorization(verify token)

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //get all users collection
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    // user collection API
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

    // get admin collection
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      //
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // make admin account
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        console.log(query);
        const updateDocument = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updateDocument);
        console.log(result);
        res.send(result);
      }
    );
    // delete users
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // get menu data from the server
    app.get("/menu", async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });
    app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDocument = {
        $set: {
          price: req.body.price,
        },
      };
      const result = await menuCollection.updateOne(query, updateDocument);
      res.send(result);
    });
    // menu post in the server

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    // delete menu item

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });
    // update menu item

    // reviews
    app.get("/reviews", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });

    // cart data

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
