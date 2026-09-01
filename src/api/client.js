import axios from 'axios';

import { API_BASE } from '../constants/config';

/**
 * Shared axios instance for the ALG backend.
 *
 * The web app relied on Create React App's dev proxy and switched between
 * relative and absolute URLs depending on `NODE_ENV`. React Native has no
 * proxy and no same-origin concept, so every request is absolute.
 */
const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export default client;
