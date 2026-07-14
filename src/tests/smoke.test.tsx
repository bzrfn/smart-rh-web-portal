import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../app/App';

test('renders login', () => {
  render(<BrowserRouter><App /></BrowserRouter>);
  expect(screen.getByText(/Login/i)).toBeInTheDocument();
});
