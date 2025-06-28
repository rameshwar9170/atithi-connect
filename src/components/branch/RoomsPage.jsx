import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, update, remove } from 'firebase/database';
import { db } from '../../firebase/config';
import './RoomsPage.css';

function RoomsPage() {
  const branchId = localStorage.getItem('branchId');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomBookings, setRoomBookings] = useState({});
  const [activeBookings, setActiveBookings] = useState({});
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [currentBookingDetails, setCurrentBookingDetails] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomQuery, setRoomQuery] = useState('');


  const [newGuest, setNewGuest] = useState({
    name: '',
    age: '',
    gender: 'male',
    address: '',
    idProof: '',
    idNumber: '',
    phone: ''
  });

  const [bookingDetails, setBookingDetails] = useState({
    checkIn: '',
    checkOut: '',
    days: 1,
    amount: 0,
    advance: '',
    paymentMode: '',
    notes: ''
  });

  useEffect(() => {
    if (!branchId) return;

    const branchRef = ref(db, `atithi-connect/Branches/${branchId}`);
    const unsubscribe = onValue(branchRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;

      let roomsData = [];
      if (data.rooms) {
        if (Array.isArray(data.rooms)) {
          roomsData = data.rooms.map((room, index) => {
            if (room && room.roomId) {
              return {
                ...room,
                firebaseIndex: index,
                status: determineRoomStatus(room.roomId, data.Bookings)
              };
            }
            return null;
          }).filter(Boolean);
        } else {
          roomsData = Object.entries(data.rooms).map(([key, room]) => ({
            ...room,
            firebaseKey: key,
            status: determineRoomStatus(room.roomId, data.Bookings)
          }));
        }
      }

      // Process active bookings for selected date only
      const activeBookingsData = {};
      if (data.Bookings) {
        const dayStart = new Date(selectedDate + 'T00:00:00');
        const dayEnd = new Date(selectedDate + 'T23:59:59');

        Object.entries(data.Bookings).forEach(([bookingId, booking]) => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          const overlaps = checkIn <= dayEnd && checkOut >= dayStart;

          if (booking.status === 'active' && overlaps) {
            activeBookingsData[booking.roomId] = {
              ...booking,
              bookingId
            };
          } else if (booking.status === 'active' && !isBookingActive(booking)) {
            expireBooking(bookingId, booking);
          }
        });
      }

      setRooms(
        roomsData.map(room => ({
          ...room,
          status: activeBookingsData[room.roomId] ? 'occupied' : 'available'
        }))
      );

      setActiveBookings(activeBookingsData);

      // Initialize roomBookings
      setRoomBookings(prev => {
        const updated = { ...prev };
        roomsData.forEach(room => {
          const roomId = room.roomId;
          if (!updated[roomId] && !activeBookingsData[roomId]) {
            const saved = localStorage.getItem(`pending-guests-${roomId}`);
            updated[roomId] = saved ? JSON.parse(saved) : [];
          }
        });
        return updated;
      });
    });

    return () => unsubscribe();
  }, [branchId, selectedDate]); // ← Dependency added here

  const determineRoomStatus = (roomId, bookings) => {
    if (!bookings) return 'available';
    const dayStart = new Date(selectedDate + 'T00:00:00');
    const dayEnd = new Date(selectedDate + 'T23:59:59');

    const activeBooking = Object.values(bookings).find(
      booking =>
        booking.roomId === roomId &&
        booking.status === 'active' &&
        new Date(booking.checkIn) <= dayEnd &&
        new Date(booking.checkOut) >= dayStart
    );

    return activeBooking ? 'occupied' : 'available';
  };

  const isBookingActive = booking => {
    const now = new Date();
    const checkOut = new Date(booking.checkOut);
    return now < checkOut;
  };

  const expireBooking = async (bookingId, booking) => {
    try {
      const bookingRef = ref(db, `atithi-connect/Branches/${branchId}/Bookings/${bookingId}`);
      await update(bookingRef, {
        status: 'completed',
        actualCheckOut: new Date().toISOString()
      });

      const room = rooms.find(r => r.roomId === booking.roomId);
      if (room) {
        await updateRoomStatus(room, 0);
      }
    } catch (error) {
      console.error('Error expiring booking:', error);
    }
  };

  useEffect(() => {
    if (selectedRoom && !activeBookings[selectedRoom.roomId]) {
      const roomId = selectedRoom.roomId;
      localStorage.setItem(`pending-guests-${roomId}`, JSON.stringify(roomBookings[roomId] || []));
    }
  }, [roomBookings, selectedRoom, activeBookings]);

  const handleRoomSelect = room => {
    setSelectedRoom(room);
    setShowGuestForm(false);
    setShowBookingForm(false);
    setShowBookingDetails(false);

    if (room.status === 'occupied' && activeBookings[room.roomId]) {
      setCurrentBookingDetails(activeBookings[room.roomId]);
      setShowBookingDetails(true);
    } else {
      const saved = localStorage.getItem(`pending-guests-${room.roomId}`);
      if (saved) {
        setRoomBookings(prev => ({
          ...prev,
          [room.roomId]: JSON.parse(saved)
        }));
      }
    }
  };

  const handleAddGuestClick = () => {
    if (!selectedRoom) return alert('Please select a room first');
    if (selectedRoom.status === 'occupied') return alert('This room is currently occupied');

    const current = roomBookings[selectedRoom.roomId] || [];
    if (current.length >= selectedRoom.totalBeds) {
      return alert('No available beds in this room');
    }

    setNewGuest({
      name: '',
      age: '',
      gender: 'male',
      address: '',
      idProof: '',
      idNumber: '',
      phone: ''
    });
    setShowGuestForm(true);
  };

  const handleAddGuest = e => {
    e.preventDefault();

    const roomId = selectedRoom.roomId;
    const current = roomBookings[roomId] || [];

    setRoomBookings(prev => {
      const updated = { ...prev };
      updated[roomId] = [
        ...current,
        {
          ...newGuest,
          guestId: Date.now().toString(),
          addedAt: new Date().toISOString()
        }
      ];
      return updated;
    });

    setShowGuestForm(false);
  };

  const updateRoomStatus = async (room, newOccupiedBeds) => {
    try {
      if (!room || !room.roomId) return;

      let updatePath = '';
      if (room.firebaseIndex !== undefined) {
        updatePath = `atithi-connect/Branches/${branchId}/rooms/${room.firebaseIndex}/occupiedBeds`;
      } else if (room.firebaseKey) {
        updatePath = `atithi-connect/Branches/${branchId}/rooms/${room.firebaseKey}/occupiedBeds`;
      }

      const updates = {};
      updates[updatePath] = newOccupiedBeds;
      await update(ref(db), updates);

      setRooms(prev =>
        prev.map(r =>
          r.roomId === room.roomId
            ? {
                ...r,
                occupiedBeds: newOccupiedBeds,
                status: newOccupiedBeds > 0 ? 'occupied' : 'available'
              }
            : r
        )
      );

      if (selectedRoom?.roomId === room.roomId) {
        setSelectedRoom(prev => ({
          ...prev,
          occupiedBeds: newOccupiedBeds,
          status: newOccupiedBeds > 0 ? 'occupied' : 'available'
        }));
      }
    } catch (error) {
      console.error('Error updating room status:', error);
      alert('Failed to update room status');
    }
  };

  const removeGuest = guestId => {
    if (!selectedRoom) return;
    const roomId = selectedRoom.roomId;
    const updated = roomBookings[roomId]?.filter(guest => guest.guestId !== guestId);

    setRoomBookings(prev => ({
      ...prev,
      [roomId]: updated
    }));
  };

  const handleCheckout = () => {
    if (!selectedRoom || !roomBookings[selectedRoom.roomId]?.length) {
      return alert('No guests to checkout');
    }

    const now = new Date(`${selectedDate}T12:00:00`);
    const next = new Date(now);
    next.setDate(now.getDate() + 1);

    setBookingDetails(prev => ({
      ...prev,
      checkIn: prev.checkIn || now.toISOString().slice(0, 16),
      checkOut: prev.checkOut || next.toISOString().slice(0, 16)
    }));

    setShowBookingForm(true);
  };

  const handleBookingSubmit = async e => {
    e.preventDefault();

    if (!bookingDetails.checkIn || !bookingDetails.checkOut || !bookingDetails.paymentMode) {
      return alert('Please fill in all required booking details');
    }

    if (new Date(bookingDetails.checkOut) <= new Date(bookingDetails.checkIn)) {
      return alert('Check-out date must be after check-in date');
    }

    try {
      const bookingRef = ref(db, `atithi-connect/Branches/${branchId}/Bookings`);
      const newBooking = push(bookingRef);

      await set(newBooking, {
        bookingId: newBooking.key,
        roomNumber: selectedRoom.roomNumber,
        roomId: selectedRoom.roomId,
        guests: roomBookings[selectedRoom.roomId],
        ...bookingDetails,
        totalAmount: bookingDetails.amount,
        balance: bookingDetails.amount - bookingDetails.advance,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      setRoomBookings(prev => ({
        ...prev,
        [selectedRoom.roomId]: []
      }));

      localStorage.removeItem(`pending-guests-${selectedRoom.roomId}`);

      await updateRoomStatus(selectedRoom, roomBookings[selectedRoom.roomId].length);

      setBookingDetails({
        checkIn: '',
        checkOut: '',
        days: 1,
        amount: 0,
        advance: '',
        paymentMode: '',
        notes: ''
      });

      setShowBookingForm(false);
      alert('Booking confirmed successfully!');
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking. Please try again.');
    }
  };

  const handleEarlyCheckout = async () => {
    if (!currentBookingDetails || !window.confirm('Are you sure you want to check out early?')) {
      return;
    }

    try {
      const bookingRef = ref(
        db,
        `atithi-connect/Branches/${branchId}/Bookings/${currentBookingDetails.bookingId}`
      );
      await update(bookingRef, {
        status: 'completed',
        actualCheckOut: new Date().toISOString(),
        earlyCheckout: true
      });

      await updateRoomStatus(selectedRoom, 0);
      setShowBookingDetails(false);
      setCurrentBookingDetails(null);

      alert('Checkout completed successfully!');
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Error during checkout. Please try again.');
    }
  };

  const handleDateChange = (field, value) => {
    setBookingDetails(prev => {
      const newDetails = { ...prev, [field]: value };

      if (newDetails.checkIn && newDetails.checkOut) {
        const checkInDate = new Date(newDetails.checkIn);
        const checkOutDate = new Date(newDetails.checkOut);

        if (checkOutDate > checkInDate) {
          const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
          const amount = days * (selectedRoom?.pricePerDay || 0);
          return { ...newDetails, days, amount };
        }
      }

      return newDetails;
    });
  };

  const getCurrentBookings = () => {
    return selectedRoom ? roomBookings[selectedRoom.roomId] || [] : [];
  };

  const clearRoomBookings = () => {
    if (!selectedRoom || !window.confirm('Are you sure you want to clear all pending bookings for this room?')) {
      return;
    }

    setRoomBookings(prev => ({
      ...prev,
      [selectedRoom.roomId]: []
    }));
    localStorage.removeItem(`pending-guests-${selectedRoom.roomId}`);
  };

  const formatDateTime = dateString => {
    return new Date(dateString).toLocaleString();
  };

  const getRemainingTime = checkOut => {
    const now = new Date();
    const end = new Date(checkOut);
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  };


  return (
    <div className="rooms-page-container">
      {/* Rooms Section */}
      <div className="hotel-rooms-section">
        {/* <h2 className="hotel-rooms-title">Hotel Rooms</h2> */}

<div className="room-page-inputs-row">
  <div className="room-page-search-container">
    <input
      type="text"
      placeholder="🔍 Search room..."
      value={roomQuery}
      onChange={(e) => setRoomQuery(e.target.value)}
      className="room-page-input"
    />
  </div>

  <div className="room-page-date-picker-container">
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="room-page-input"
    />
  </div>
</div>


        <div className="hotel-rooms-grid">
       {rooms
  .filter(room =>
    room.roomNumber.toLowerCase().includes(roomQuery.toLowerCase())
  )
  .map(room => (
    <div
      key={room.roomId}
      className={`hotel-room-card ${room.status === 'available' ? 'room-available' : 'room-occupied'} ${selectedRoom?.roomId === room.roomId ? 'room-selected' : ''}`}
      onClick={() => handleRoomSelect(room)}
    >
      <div className="hotel-room-number">Room {room.roomNumber}</div>

      <div className="hotel-room-price">
        <div className="hotel-room-type">{room.roomType || 'Standard'}</div>
        ₹{room.pricePerDay || 'NA'}/day
      </div>

      {room.status === 'available' && (
        <div className="hotel-room-status">
          Available
        </div>
      )}

      {room.status === 'occupied' && activeBookings[room.roomId] && (
        <div className="room-time-remaining">
          {getRemainingTime(activeBookings[room.roomId].checkOut)}
        </div>
      )}
    </div>
))}

        </div>
      </div>

      {/* Main Content Area */}
      <div className="bookings-main-content">
        {/* Selected Room Header */}
        <div className="selected-room-section">
          <h3 className="selected-room-title">
            {selectedRoom ? `Room ${selectedRoom.roomNumber}` : 'Select a Room'}
          </h3>
          
          {selectedRoom && selectedRoom.status === 'available' && (
            <div className="room-actions">
              <button 
                onClick={handleAddGuestClick}
                className="add-guest-btn"
                disabled={getCurrentBookings().length >= selectedRoom.totalBeds}
              >
                Add Guest
              </button>
            </div>
          )}
        </div>

        {/* Booking Details Modal for Occupied Rooms */}
        {showBookingDetails && currentBookingDetails && (
          <div className="booking-details-modal">
            <div className="booking-details-content">
              <h3 className="booking-details-title">
                Current Booking - Room {selectedRoom?.roomNumber}
              </h3>
              
              <div className="booking-info-grid">
                <div className="booking-info-item">
                  <label>Check-In:</label>
                  <span>{formatDateTime(currentBookingDetails.checkIn)}</span>
                </div>
                <div className="booking-info-item">
                  <label>Check-Out:</label>
                  <span>{formatDateTime(currentBookingDetails.checkOut)}</span>
                </div>
                <div className="booking-info-item">
                  <label>Duration:</label>
                  <span>{currentBookingDetails.days} days</span>
                </div>
                <div className="booking-info-item">
                  <label>Total Amount:</label>
                  <span>₹{currentBookingDetails.totalAmount}</span>
                </div>
                <div className="booking-info-item">
                  <label>Advance Paid:</label>
                  <span>₹{currentBookingDetails.advance}</span>
                </div>
                <div className="booking-info-item">
                  <label>Balance:</label>
                  <span>₹{currentBookingDetails.balance}</span>
                </div>
                <div className="booking-info-item">
                  <label>Payment Mode:</label>
                  <span>{currentBookingDetails.paymentMode}</span>
                </div>
                <div className="booking-info-item">
                  <label>Time Remaining:</label>
                  <span className="time-remaining">
                    {getRemainingTime(currentBookingDetails.checkOut)}
                  </span>
                </div>
              </div>

              <div className="guests-details-section">
                <h4>Guests:</h4>
                <div className="guests-list">
                  {currentBookingDetails.guests?.map((guest, index) => (
                    <div key={index} className="guest-detail-card">
                      <div className="guest-name">{guest.name}</div>
                      <div className="guest-info">
                        {guest.age} years, {guest.gender}, {guest.phone}
                      </div>
                      <div className="guest-id">
                        {guest.idProof}: {guest.idNumber}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentBookingDetails.notes && (
                <div className="booking-notes">
                  <label>Notes:</label>
                  <p>{currentBookingDetails.notes}</p>
                </div>
              )}

              <div className="booking-actions">
                <button
                  onClick={handleEarlyCheckout}
                  className="early-checkout-btn"
                >
                  Early Checkout
                </button>
                <button
                  onClick={() => setShowBookingDetails(false)}
                  className="close-details-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Guest Form Modal */}
        {showGuestForm && (
          <div className="guest-form-modal">
            <div className="guest-form-content">
              <h3 className="guest-form-title">Add New Guest</h3>
              <form onSubmit={handleAddGuest} className="guest-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={newGuest.name}
                      onChange={e => setNewGuest({...newGuest, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      value={newGuest.age}
                      onChange={e => setNewGuest({...newGuest, age: e.target.value})}
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      value={newGuest.gender}
                      onChange={e => setNewGuest({...newGuest, gender: e.target.value})}
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={newGuest.phone}
                      onChange={e => setNewGuest({...newGuest, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Address *</label>
                  <textarea
                    value={newGuest.address}
                    onChange={e => setNewGuest({...newGuest, address: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>ID Proof Type *</label>
                    <select
                      value={newGuest.idProof}
                      onChange={e => setNewGuest({...newGuest, idProof: e.target.value})}
                      required
                    >
                      <option value="">Select ID Proof</option>
                      <option value="aadhar">Aadhar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving">Driving License</option>
                      <option value="voter">Voter ID</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>ID Number *</label>
                    <input
                      type="text"
                      value={newGuest.idNumber}
                      onChange={e => setNewGuest({...newGuest, idNumber: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowGuestForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Add Guest
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Booking Guests Table - Only for available rooms */}
        {selectedRoom && selectedRoom.status === 'available' && (
          <div className="booking-guests-section">
            {getCurrentBookings().length > 0 ? (
              <div className="booking-guests-table">
                <div className="booking-table-header">
                  <div className="booking-header-item">Guest Name</div>
                  <div className="booking-header-age">Age</div>
                  <div className="booking-header-gender">Gender</div>
                  <div className="booking-header-phone">Phone</div>
                  <div className="booking-header-id">ID Proof</div>
                  <div className="booking-header-action">Action</div>
                </div>
                {getCurrentBookings().map(guest => (
                  <div key={guest.guestId} className="booking-table-row">
                    <div className="booking-row-item">
                      <div className="guest-name">{guest.name}</div>
                      <div className="guest-address">{guest.address}</div>
                    </div>
                    <div className="booking-row-age">{guest.age}</div>
                    <div className="booking-row-gender">
                      {guest.gender === 'male' ? 'Male' : 
                       guest.gender === 'female' ? 'Female' : 'Other'}
                    </div>
                    <div className="booking-row-phone">{guest.phone}</div>
                    <div className="booking-row-id">
                      <div className="id-type">
                        {guest.idProof === 'aadhar' ? 'Aadhar' :
                         guest.idProof === 'pan' ? 'PAN' :
                         guest.idProof === 'passport' ? 'Passport' :
                         guest.idProof === 'driving' ? 'DL' :
                         guest.idProof === 'voter' ? 'Voter ID' : ''}
                      </div>
                      <div className="id-number">{guest.idNumber}</div>
                    </div>
                    <div className="booking-row-action">
                      <button
                        onClick={() => removeGuest(guest.guestId)}
                        className="remove-guest-btn"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-booking-state">
                <div className="empty-booking-icon">🛏️</div>
                <p className="empty-booking-message">
                  No guests added yet. Click "Add Guest" to book this room.
                </p>
              </div>
            )}
          </div>
        )}

        {!selectedRoom && (
          <div className="no-room-selected-state">
            <div className="no-room-icon">🏨</div>
            <h3 className="no-room-title">Select a Room</h3>
            <p className="no-room-message">
              Choose a room from above to start managing bookings
            </p>
          </div>
        )}

        {/* Clear All Bookings Button - Only for available rooms with pending guests */}
        {selectedRoom && selectedRoom.status === 'available' && getCurrentBookings().length > 0 && (
          <div className="clear-bookings-section">
            <button
              onClick={clearRoomBookings}
              className="clear-all-bookings-btn"
            >
              Clear Pending Bookings
            </button>
          </div>
        )}
      </div>

      {/* Footer with Checkout Button - Only for available rooms with guests */}
      {selectedRoom && selectedRoom.status === 'available' && getCurrentBookings().length > 0 && (
        <div className="rooms-page-footer">
          <button
            className="checkout-btn"
            onClick={handleCheckout}
          >
            Complete Booking
          </button>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="booking-form-modal">
          <div className="booking-form-content">
            <h3 className="booking-form-title">Complete Booking for Room {selectedRoom?.roomNumber}</h3>
            <form onSubmit={handleBookingSubmit} className="booking-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Check-In Date *</label>
                  <input
                    type="datetime-local"
                    value={bookingDetails.checkIn}
                    onChange={e => handleDateChange('checkIn', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-Out Date *</label>
                  <input
                    type="datetime-local"
                    value={bookingDetails.checkOut}
                    onChange={e => handleDateChange('checkOut', e.target.value)}
                    required
                    min={bookingDetails.checkIn}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Days</label>
                  <input
                    type="number"
                    value={bookingDetails.days}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Room Price (per day)</label>
                  <input
                    type="text"
                    value={`₹${selectedRoom?.pricePerDay || 0}`}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Total Amount</label>
                  <input
                    type="text"
                    value={`₹${bookingDetails.amount || 0}`}
                    readOnly
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Advance Payment *</label>
                  <input
                    type="number"
                    value={bookingDetails.advance}
                    onChange={e => setBookingDetails({
                      ...bookingDetails, 
                      advance: Number(e.target.value)
                    })}
                    min="0"
                    max={bookingDetails.amount}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Balance</label>
                  <input
                    type="text"
                    value={`₹${bookingDetails.amount - bookingDetails.advance}`}
                    readOnly
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Payment Mode *</label>
                <div className="payment-options">
                  <label>
                    <input
                      type="radio"
                      name="paymentMode"
                      value="cash"
                      checked={bookingDetails.paymentMode === 'cash'}
                      onChange={() => setBookingDetails({
                        ...bookingDetails, 
                        paymentMode: 'cash'
                      })}
                      required
                    />
                    Cash
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMode"
                      value="online"
                      checked={bookingDetails.paymentMode === 'online'}
                      onChange={() => setBookingDetails({
                        ...bookingDetails, 
                        paymentMode: 'online'
                      })}
                    />
                    Online
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMode"
                      value="card"
                      checked={bookingDetails.paymentMode === 'card'}
                      onChange={() => setBookingDetails({
                        ...bookingDetails, 
                        paymentMode: 'card'
                      })}
                    />
                    Card
                  </label>
                </div>
              </div>
              
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={bookingDetails.notes}
                  onChange={e => setBookingDetails({
                    ...bookingDetails, 
                    notes: e.target.value
                  })}
                  placeholder="Any special requests or notes..."
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowBookingForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomsPage;