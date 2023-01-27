const path = require("path");
const fsPromises = require("fs/promises");
const { GraphQLError } = require("graphql");
const {
  fileExists,
  getDirectoryFileNames,
  deleteFile,
  readJsonFile,
} = require("../utils/fileHandling");
const crypto = require("crypto");
//const axios = require("axios").default;

const productsDirectory = path.join(__dirname, "..", "data", "products");
const cartsDirectory = path.join(__dirname, "..", "data", "carts");

exports.resolvers = {
  Query: {
    getCart: async (_, args) => {
      const cartId = args.cartId;
      const cartFilePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");
      const cartData = await fsPromises.readFile(cartFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(cartData);
      return data;
    },
    getProduct: async (_, args) => {
      const productId = args.productId;
      const productFilePath = path.join(productsDirectory, `${productId}.json`);
      const productExists = await fileExists(productFilePath);
      if (!productExists)
        return new GraphQLError("That product does not exist");
      const productData = await fsPromises.readFile(productFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(productData);
      return data;
    },
    getAllProducts: async (_, args) => {
      const products = await getDirectoryFileNames(productsDirectory);
      const productData = [];

      for (const file of products) {
        const filePath = path.join(productsDirectory, file);
        const fileContents = await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        });
        const data = JSON.parse(fileContents);
        productData.push(data);
      }
      return productData;
    },
  },
  Mutation: {
    createCart: async (_, args) => {
      //if (args.cartId === cartId)
      //return new GraphQLError("That cart already exists");
      const newCart = {
        id: crypto.randomUUID(),
        products: [],
        totalSum: "0",
      };
      let filePath = path.join(cartsDirectory, `${newCart.id}.json`);
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        if (exists) {
          newCart.id = crypto.randomUUID;
          filePath = path.join(cartsDirectory, `${newCart.id}.json`);
        }
        idExists = exists;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newCart));
      return newCart;
    },
    addProductToCart: async (_, args) => {
      const { cartId, productId } = args;
      const cartFilePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const data = await readJsonFile(cartFilePath);

      let productInCartExist = false;
      for (let x of data.products) {
        if (x.id === productId) {
          x.quantity++;
          productInCartExist = true;
        }
      }
      if (!productInCartExist) {
        const productFilePath = path.join(
          productsDirectory,
          `${productId}.json`
        );
        const productExists = await fileExists(productFilePath);
        if (!productExists)
          return new GraphQLError("That product does not exist");
        const productData = await readJsonFile(productFilePath);

        const newProductInCart = {
          id: productData.id,
          name: productData.productName,
          quantity: "1",
          price: productData.unitPrice,
        };
        data.products.push(newProductInCart);
      }
      let sum = 0;
      for (let x of data.products) {
        sum += x.quantity * x.price;
      }
      data.totalSum = sum;
      await fsPromises.writeFile(cartFilePath, JSON.stringify(data));
      return data;
    },
    deletedCart: async (_, args) => {
      const cartId = args.cartId;
      let filePath = path.join(cartsDirectory, `${cartId}.json`);

      const cartExists = await fileExists(filePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: cartId,
          success: false,
        };
      }
      return {
        deletedId: cartId,
        success: true,
      };
    },
    deleteProduct: async (_, args) => {
      const productId = args.productId;
      let filePath = path.join(productsDirectory, `${productId}.json`);

      const productExists = await fileExists(filePath);
      if (!productExists)
        return new GraphQLError("That product does not exist");
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: productId,
          success: false,
        };
      }
      return {
        deletedId: productId,
        success: true,
      };
    },
    deleteProductFromCart: async (_, args) => {
      const { cartId, productInCartId } = args;
      const cartFilePath = path.join(cartsDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const data = await readJsonFile(cartFilePath);

      let productInCartExist = false;

      for (let i = 0; i < data.products.length; i++) {
        if (data.products[i].id === productInCartId) {
          data.products[i].quantity--;
          productInCartExist = true;
          if (data.products[i].quantity === 0) {
            console.log(data.products[i].quantity);
            data.products.splice(i, 1);
          }
        }
      }
      if (!productInCartExist) {
        return new GraphQLError("That product does not exist in this cart");
      }
      let sum = 0;
      for (let x of data.products) {
        sum += x.quantity * x.unitPrice;
      }
      data.totalSum = sum;
      await fsPromises.writeFile(cartFilePath, JSON.stringify(data));
      return data;
    },
  },
};
