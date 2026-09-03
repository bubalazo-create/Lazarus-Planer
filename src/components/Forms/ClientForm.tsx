import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { Client } from '../../models/types';
import { useAppContext } from '../../context/AppContext';
import styles from './ClientForm.module.css';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, client }) => {
  const { dispatch } = useAppContext();
  
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    vatNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setFormData({ ...client });
      } else {
        setFormData({
          name: '',
          vatNumber: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          notes: ''
        });
      }
    }
  }, [isOpen, client]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) return;

    const newClient: Client = {
      id: client?.id || uuidv4(),
      name: formData.name,
      vatNumber: formData.vatNumber || '',
      contactPerson: formData.contactPerson || '',
      phone: formData.phone || '',
      email: formData.email || '',
      address: formData.address || '',
      notes: formData.notes || '',
      createdAt: client?.createdAt || new Date().toISOString()
    };

    if (client) {
      dispatch({ type: 'UPDATE_CLIENT', client: newClient });
    } else {
      dispatch({ type: 'ADD_CLIENT', client: newClient });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Edit Client' : 'Add Client'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Client Name"
          name="name"
          value={formData.name || ''}
          onChange={(val) => handleChange('name', val)}
          required
          autoFocus
        />
        
        <Input
          label="VAT Number"
          name="vatNumber"
          value={formData.vatNumber || ''}
          onChange={(val) => handleChange('vatNumber', val)}
        />
        
        <div className={styles.row}>
          <Input
            label="Contact Person"
            name="contactPerson"
            value={formData.contactPerson || ''}
            onChange={(val) => handleChange('contactPerson', val)}
          />
          <Input
            label="Phone"
            name="phone"
            value={formData.phone || ''}
            onChange={(val) => handleChange('phone', val)}
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={(val) => handleChange('email', val)}
        />

        <Input
          label="Address"
          name="address"
          value={formData.address || ''}
          onChange={(val) => handleChange('address', val)}
        />

        <div className={styles.formGroup}>
          <label className="form-label">Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            className="form-input"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {client ? 'Save Changes' : 'Add Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientForm;
