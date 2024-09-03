import React, { useState } from 'react';

const TransferOwnershipModal = ({ members, onTransfer, onCancel }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSubmit = () => {
    console.log(members)
    if (selectedUser) {
      onTransfer(selectedUser);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Select New Owner</h3>
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              <label>
                <input
                  type="radio"
                  name="owner"
                  checked={selectedUser === member.id}
                  onChange={() => setSelectedUser(member.id)}
                />
                {member.name}
              </label>
            </li>
          ))}
        </ul>
        <button onClick={handleSubmit}>Transfer Ownership</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default TransferOwnershipModal;
