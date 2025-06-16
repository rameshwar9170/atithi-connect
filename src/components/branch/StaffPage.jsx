import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { ref, push, set, onValue, remove } from 'firebase/database';
import './StaffPage.css';

function StaffPage() {
  const branchId = localStorage.getItem('branchId');
  const [staffList, setStaffList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [newStaff, setNewStaff] = useState({
    name: '',
    address: '',
    phone: '',
    aadhar: '',
    education: '',
    salary: '',
    shiftTime: '',
    designation: ''
  });

  useEffect(() => {
    const staffRef = ref(db, `atithi-connect/Branches/${branchId}/Staff`);
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((id) => ({ id, ...data[id] }));
        setStaffList(list);
      } else {
        setStaffList([]);
      }
    });
  }, [branchId]);

  const validateForm = () => {
    const { name, address, phone, aadhar, education, salary, shiftTime, designation } = newStaff;
    if (!name || !address || !phone || !aadhar || !education || !salary || !shiftTime || !designation) {
      return 'Please fill in all fields.';
    }
    if (!/^\d{10}$/.test(phone)) return 'Phone number must be 10 digits.';
    if (!/^\d{12}$/.test(aadhar)) return 'Aadhar number must be 12 digits.';
    return '';
  };

  const handleAddStaff = () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const staffRef = push(ref(db, `atithi-connect/Branches/${branchId}/Staff`));
    set(staffRef, newStaff);
    setShowForm(false);
    setFormError('');
    setNewStaff({
      name: '',
      address: '',
      phone: '',
      aadhar: '',
      education: '',
      salary: '',
      shiftTime: '',
      designation: ''
    });
  };

  const handleDelete = (id) => {
    remove(ref(db, `atithi-connect/Branches/${branchId}/Staff/${id}`));
  };

  const handleChange = (e) => {
    setNewStaff({ ...newStaff, [e.target.name]: e.target.value });
  };

  return (
    <div className="staff-container">
      <h2 className="staff-heading">Staff Management</h2>

      {staffList.length === 0 && !showForm && (
        <div className="staff-no-records">
          <p>No staff added yet.</p>
          <button className="staff-add-button" onClick={() => setShowForm(true)}>Add Staff</button>
        </div>
      )}

      {showForm && (
        <div className="staff-form">
          <div className="staff-form-grid">
            <input name="name" placeholder="Full Name" value={newStaff.name} onChange={handleChange} />
            <input name="address" placeholder="Address" value={newStaff.address} onChange={handleChange} />
            <input name="phone" placeholder="Phone Number" value={newStaff.phone} onChange={handleChange} />
            <input name="aadhar" placeholder="Aadhar Number" value={newStaff.aadhar} onChange={handleChange} />
            <select name="education" value={newStaff.education} onChange={handleChange}>
              <option value="">Select Education</option>
              <option value="10th">10th</option>
              <option value="12th">12th</option>
              <option value="Bachelors">Bachelors</option>
              <option value="Masters">Masters</option>
            </select>
            <input name="salary" placeholder="Salary ₹" value={newStaff.salary} onChange={handleChange} />
            <input name="shiftTime" placeholder="Shift Time (e.g. 9AM - 6PM)" value={newStaff.shiftTime} onChange={handleChange} />
            <input name="designation" placeholder="Designation" value={newStaff.designation} onChange={handleChange} />
          </div>
          {formError && <p className="staff-error">{formError}</p>}
          <button className="staff-submit-button" onClick={handleAddStaff}>Save Staff</button>
        </div>
      )}

      {staffList.length > 0 && (
        <div className="staff-table-wrapper">
          <button
  className={`staff-add-button ${showForm ? 'cancel' : ''}`}
  onClick={() => {
    if (showForm) {
      // Reset when cancelling
      setFormError('');
      setNewStaff({
        name: '',
        address: '',
        phone: '',
        aadhar: '',
        education: '',
        salary: '',
        shiftTime: '',
        designation: ''
      });
    }
    setShowForm(!showForm); // Toggle form visibility
  }}
>
  {showForm ? 'Cancel' : 'Add Staff'}
</button>

          <div className="staff-table-scroll">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Aadhar</th>
                  <th>Education</th>
                  <th>Salary</th>
                  <th>Shift</th>
                  <th>Designation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.name}</td>
                    <td>{staff.phone}</td>
                    <td>{staff.aadhar}</td>
                    <td>{staff.education}</td>
                    <td>₹{staff.salary}</td>
                    <td>{staff.shiftTime}</td>
                    <td>{staff.designation}</td>
                    <td>
                      <button className="staff-delete-button" onClick={() => handleDelete(staff.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPage;
