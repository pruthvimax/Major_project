import { expect } from "chai";
import { ethers } from "hardhat";
import { FarmMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FarmMarketplace", function () {
  let farmMarketplace: FarmMarketplace;
  let relayer: SignerWithAddress;
  let farmer: SignerWithAddress;
  let buyer: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    [relayer, farmer, buyer, ...addrs] = await ethers.getSigners();

    const FarmMarketplaceFactory = await ethers.getContractFactory("FarmMarketplace");
    farmMarketplace = await FarmMarketplaceFactory.deploy() as FarmMarketplace;
  });

  describe("Product Listing", function () {
    it("should allow a farmer to list a product", async function () {
      const price = ethers.parseEther("1"); // 1 ETH
      await expect(farmMarketplace.connect(relayer).listProduct(farmer.address, "Organic Tomatoes", price))
        .to.emit(farmMarketplace, "ProductListed")
        .withArgs(1, farmer.address, "Organic Tomatoes", price);

      const product = await farmMarketplace.products(1);
      expect(product.id).to.equal(1);
      expect(product.name).to.equal("Organic Tomatoes");
      expect(product.farmer).to.equal(farmer.address);
      expect(product.currentOwner).to.equal(farmer.address);
      expect(product.price).to.equal(price);
      expect(product.isListed).to.be.true;

      const history = await farmMarketplace.getProductHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0]).to.equal(farmer.address);
    });

    it("should reject listing if name is empty or price is 0", async function () {
      await expect(farmMarketplace.connect(relayer).listProduct(farmer.address, "", ethers.parseEther("1")))
        .to.be.revertedWith("Product name is required");

      await expect(farmMarketplace.connect(relayer).listProduct(farmer.address, "Apple", 0))
        .to.be.revertedWith("Price must be greater than zero");
    });
  });

  describe("Product Purchase", function () {
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      await farmMarketplace.connect(relayer).listProduct(farmer.address, "Organic Tomatoes", price);
    });

    it("should allow a buyer to purchase a product and escrow funds", async function () {
      await expect(farmMarketplace.connect(relayer).purchaseProduct(1, buyer.address, { value: price }))
        .to.emit(farmMarketplace, "ProductPurchased")
        .withArgs(1, 1, buyer.address, price);

      const product = await farmMarketplace.products(1);
      expect(product.isListed).to.be.false;

      const order = await farmMarketplace.orders(1);
      expect(order.orderId).to.equal(1);
      expect(order.productId).to.equal(1);
      expect(order.buyer).to.equal(buyer.address);
      expect(order.escrowAmount).to.equal(price);
      expect(order.status).to.equal(0); // OrderStatus.Pending
    });

    it("should reject purchase with incorrect value or if buyer is the farmer", async function () {
      await expect(farmMarketplace.connect(relayer).purchaseProduct(1, buyer.address, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Please submit the exact price amount");

      await expect(farmMarketplace.connect(relayer).purchaseProduct(1, farmer.address, { value: price }))
        .to.be.revertedWith("Farmer cannot buy their own product");
    });
  });

  describe("Traceability", function () {
    it("should expose product and order details for traceability", async function () {
      const price = ethers.parseEther("1");
      await farmMarketplace.connect(relayer).listProduct(farmer.address, "Organic Tomatoes", price);

      const productDetails = await farmMarketplace.getProductDetails(1);
      expect(productDetails.id).to.equal(1);
      expect(productDetails.farmer).to.equal(farmer.address);
      expect(productDetails.name).to.equal("Organic Tomatoes");
      expect(productDetails.currentOwner).to.equal(farmer.address);
      expect(productDetails.price).to.equal(price);
      expect(productDetails.isListed).to.be.true;

      await farmMarketplace.connect(relayer).purchaseProduct(1, buyer.address, { value: price });

      const orderDetails = await farmMarketplace.getOrderDetails(1);
      expect(orderDetails.orderId).to.equal(1);
      expect(orderDetails.productId).to.equal(1);
      expect(orderDetails.buyer).to.equal(buyer.address);
      expect(orderDetails.escrowAmount).to.equal(price);
      expect(orderDetails.status).to.equal(0);
    });
  });

  describe("Delivery Confirmation", function () {
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      await farmMarketplace.connect(relayer).listProduct(farmer.address, "Organic Tomatoes", price);
      await farmMarketplace.connect(relayer).purchaseProduct(1, buyer.address, { value: price });
    });

    it("should release escrow funds to farmer and update ownership when delivery is confirmed", async function () {
      const initialFarmerBalance = await ethers.provider.getBalance(farmer.address);

      await expect(farmMarketplace.connect(relayer).confirmDelivery(1))
        .to.emit(farmMarketplace, "DeliveryConfirmed")
        .withArgs(1, 1, buyer.address, farmer.address, price);

      const finalFarmerBalance = await ethers.provider.getBalance(farmer.address);
      expect(finalFarmerBalance - initialFarmerBalance).to.equal(price);

      const product = await farmMarketplace.products(1);
      expect(product.currentOwner).to.equal(buyer.address);

      const history = await farmMarketplace.getProductHistory(1);
      expect(history.length).to.equal(2);
      expect(history[1]).to.equal(buyer.address);

      const order = await farmMarketplace.orders(1);
      expect(order.status).to.equal(1); // OrderStatus.Completed
      expect(order.escrowAmount).to.equal(0);
    });
  });

  describe("Order Cancellation", function () {
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      await farmMarketplace.connect(relayer).listProduct(farmer.address, "Organic Tomatoes", price);
      await farmMarketplace.connect(relayer).purchaseProduct(1, buyer.address, { value: price });
    });

    it("should allow order cancellation and refund buyer", async function () {
      const initialBuyerBalance = await ethers.provider.getBalance(buyer.address);

      await expect(farmMarketplace.connect(relayer).cancelOrder(1))
        .to.emit(farmMarketplace, "OrderCancelled")
        .withArgs(1, 1, buyer.address, price);

      const finalBuyerBalance = await ethers.provider.getBalance(buyer.address);
      expect(finalBuyerBalance - initialBuyerBalance).to.equal(price);

      const product = await farmMarketplace.products(1);
      expect(product.isListed).to.be.true; // Relisted

      const order = await farmMarketplace.orders(1);
      expect(order.status).to.equal(2); // OrderStatus.Cancelled
      expect(order.escrowAmount).to.equal(0);
    });
  });
});
