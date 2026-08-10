// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FarmMarketplace {
    enum OrderStatus { Pending, Completed, Cancelled }

    struct Product {
        uint256 id;
        address payable farmer;
        string name;
        address currentOwner;
        uint256 price; // Price in Wei
        bool isListed;
    }

    struct Order {
        uint256 orderId;
        uint256 productId;
        address buyer;
        uint256 escrowAmount;
        OrderStatus status;
    }

    uint256 public productCount;
    uint256 public orderCount;

    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    // Map product ID to its latest order ID
    mapping(uint256 => uint256) public productLatestOrder;
    // Track ownership history: productId => array of owners
    mapping(uint256 => address[]) public productHistory;

    event ProductListed(
        uint256 indexed id,
        address indexed farmer,
        string name,
        uint256 price
    );

    event ProductPurchased(
        uint256 indexed orderId,
        uint256 indexed productId,
        address indexed buyer,
        uint256 price
    );

    event DeliveryConfirmed(
        uint256 indexed orderId,
        uint256 indexed productId,
        address indexed buyer,
        address farmer,
        uint256 amountReleased
    );

    event OrderCancelled(
        uint256 indexed orderId,
        uint256 indexed productId,
        address indexed buyer,
        uint256 amountRefunded
    );

    // List a new product (allows specifying custom farmer address)
    function listProduct(address payable _farmer, string memory _name, uint256 _price) external returns (uint256) {
        require(_farmer != address(0), "Invalid farmer address");
        require(bytes(_name).length > 0, "Product name is required");
        require(_price > 0, "Price must be greater than zero");

        productCount++;
        products[productCount] = Product({
            id: productCount,
            farmer: _farmer,
            name: _name,
            currentOwner: _farmer,
            price: _price,
            isListed: true
        });

        productHistory[productCount].push(_farmer);

        emit ProductListed(productCount, _farmer, _name, _price);
        return productCount;
    }

    // Purchase a product (places funds in escrow, allows specifying custom buyer address)
    function purchaseProduct(uint256 _productId, address _buyer) external payable returns (uint256) {
        Product storage product = products[_productId];
        require(product.id > 0, "Product does not exist");
        require(product.isListed, "Product is not available for purchase");
        require(msg.value == product.price, "Please submit the exact price amount");
        require(_buyer != product.farmer, "Farmer cannot buy their own product");

        product.isListed = false;

        orderCount++;
        orders[orderCount] = Order({
            orderId: orderCount,
            productId: _productId,
            buyer: _buyer,
            escrowAmount: msg.value,
            status: OrderStatus.Pending
        });

        productLatestOrder[_productId] = orderCount;

        emit ProductPurchased(orderCount, _productId, _buyer, msg.value);
        return orderCount;
    }

    // Confirm delivery (releases funds from escrow to the farmer)
    function confirmDelivery(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.orderId > 0, "Order does not exist");
        require(order.status == OrderStatus.Pending, "Order is not pending");
        
        Product storage product = products[order.productId];

        order.status = OrderStatus.Completed;
        uint256 payment = order.escrowAmount;
        order.escrowAmount = 0;

        // Transfer funds to the farmer
        (bool success, ) = product.farmer.call{value: payment}("");
        require(success, "Transfer of payment failed");

        // Update product ownership
        product.currentOwner = order.buyer;
        productHistory[order.productId].push(order.buyer);

        emit DeliveryConfirmed(_orderId, order.productId, order.buyer, product.farmer, payment);
    }

    // Cancel order (refunds buyer)
    function cancelOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.orderId > 0, "Order does not exist");
        require(order.status == OrderStatus.Pending, "Order is not pending");
        
        Product storage product = products[order.productId];

        order.status = OrderStatus.Cancelled;
        uint256 refund = order.escrowAmount;
        order.escrowAmount = 0;
        product.isListed = true; // Relist product

        // Refund buyer
        (bool success, ) = payable(order.buyer).call{value: refund}("");
        require(success, "Refund failed");

        emit OrderCancelled(_orderId, order.productId, order.buyer, refund);
    }

    // Get ownership history of a product
    function getProductDetails(uint256 _productId) external view returns (Product memory) {
        require(products[_productId].id > 0, "Product does not exist");
        return products[_productId];
    }

    function getOrderDetails(uint256 _orderId) external view returns (Order memory) {
        require(orders[_orderId].orderId > 0, "Order does not exist");
        return orders[_orderId];
    }

    function getProductHistory(uint256 _productId) external view returns (address[] memory) {
        return productHistory[_productId];
    }
}
