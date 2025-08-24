import React, { useState, useEffect } from 'react';
import { MenuItem, menuService, orderService, CreateOrderRequest } from '../../services/api';

interface MenuDisplayProps {
  onClose: () => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onClose }) => {
  const [menu, setMenu] = useState<{ [key: string]: MenuItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    loadTodaysMenu();
  }, []);

  const loadTodaysMenu = async () => {
    try {
      setLoading(true);
      const response = await menuService.getTodaysMenu();
      if (response.success && response.menu) {
        setMenu(response.menu);
      } else {
        setError('Failed to load menu');
      }
    } catch (err) {
      setError('Error loading menu');
      console.error('Menu loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    let total = 0;
    Object.entries(cart).forEach(([itemId, quantity]) => {
      const item = findItemById(itemId);
      if (item) {
        total += item.price * quantity;
      }
    });
    return total;
  };

  const findItemById = (itemId: string): MenuItem | null => {
    for (const categoryItems of Object.values(menu)) {
      const item = categoryItems.find(item => item.id === itemId);
      if (item) return item;
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) return;

    try {
      setOrdering(true);
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity
      }));

      const orderData: CreateOrderRequest = {
        orderFor: 'self',
        items,
        deliveryDate: new Date().toISOString().split('T')[0],
        mealType: 'lunch',
        specialInstructions: ''
      };

      const response = await orderService.createOrder(orderData);
      if (response.success) {
        alert('Order placed successfully!');
        setCart({});
        onClose();
      } else {
        alert('Failed to place order: ' + response.message);
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Error placing order');
    } finally {
      setOrdering(false);
    }
  };

  const getDietaryBadges = (item: MenuItem) => {
    const badges = [];
    if (item.isVegetarian) badges.push('🌱 Veg');
    if (item.isVegan) badges.push('🌿 Vegan');
    if (item.isGlutenFree) badges.push('🌾 Gluten-Free');
    return badges;
  };

  if (loading) {
    return (
      <div className="menu-overlay">
        <div className="menu-modal">
          <div className="loading-center">
            <div className="loading large"></div>
            <p>Loading today's menu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-overlay">
        <div className="menu-modal">
          <div className="error-center">
            <p>{error}</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-overlay">
      <div className="menu-modal">
        <div className="menu-header">
          <h2>Today's Menu</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <div className="menu-content">
          {Object.entries(menu).map(([category, items]) => (
            <div key={category} className="menu-category">
              <h3 className="category-title">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h3>
              <div className="menu-items">
                {items.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-description">{item.description}</p>
                      <div className="item-details">
                        <span className="price">Rs. {item.price.toFixed(2)}</span>
                        <span className="calories">{item.nutritionInfo.calories} cal</span>
                      </div>
                      <div className="dietary-badges">
                        {getDietaryBadges(item).map((badge, index) => (
                          <span key={index} className="badge">{badge}</span>
                        ))}
                      </div>
                    </div>
                    <div className="item-actions">
                      <div className="quantity-controls">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="btn btn-sm"
                          disabled={!cart[item.id]}
                        >
                          -
                        </button>
                        <span className="quantity">{cart[item.id] || 0}</span>
                        <button 
                          onClick={() => addToCart(item.id)}
                          className="btn btn-sm btn-primary"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(cart).length > 0 && (
          <div className="cart-summary">
            <div className="cart-items">
              <h4>Order Summary</h4>
              {Object.entries(cart).map(([itemId, quantity]) => {
                const item = findItemById(itemId);
                return item ? (
                  <div key={itemId} className="cart-item">
                    <span>{item.name} × {quantity}</span>
                    <span>Rs. {(item.price * quantity).toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="cart-total">
              <strong>Total: Rs. {getCartTotal().toFixed(2)}</strong>
            </div>
            <button 
              onClick={handlePlaceOrder}
              className="btn btn-primary btn-block"
              disabled={ordering}
            >
              {ordering ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuDisplay;