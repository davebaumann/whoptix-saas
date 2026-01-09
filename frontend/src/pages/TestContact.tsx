import { useState } from 'react';

export default function TestContact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('TEST CONTACT: Form submitted', formData);
    setIsSubmitting(true);
    setResult('');

    try {
      console.log('TEST CONTACT: Making request to /api/contact_us');
      const response = await fetch('/api/contact_us', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject,
          message: `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`,
          userEmail: formData.email
        })
      });

      console.log('TEST CONTACT: Response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        setResult(`SUCCESS: ${JSON.stringify(data)}`);
      } else {
        setResult(`ERROR: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('TEST CONTACT: Error:', error);
      setResult(`EXCEPTION: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>TEST CONTACT FORM</h1>
      <p>This is a test page to verify the new contact_us API endpoint works.</p>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Name:</label><br />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label><br />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Subject:</label><br />
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            required
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Message:</label><br />
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            required
            rows={4}
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none' }}
        >
          {isSubmitting ? 'Sending...' : 'Send Test Message'}
        </button>
      </form>
      
      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: result.startsWith('SUCCESS') ? '#d4edda' : '#f8d7da',
          border: '1px solid ' + (result.startsWith('SUCCESS') ? '#c3e6cb' : '#f5c6cb'),
          borderRadius: '4px'
        }}>
          <strong>Result:</strong> {result}
        </div>
      )}
    </div>
  );
}