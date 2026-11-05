import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'jsr:@supabase/supabase-js@2': '@supabase/supabase-js',
      'npm:zod@4.6.7': 'zod',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
            },
            {
              name: 'query-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
            },
            {
              name: 'recharts-vendor',
              test: /node_modules[\\/]recharts[\\/]/,
            },
            {
              name: 'form-vendor',
              test: /node_modules[\\/](react-hook-form|@hookform)[\\/]/,
            },
            {
              name: 'zod-vendor',
              test: /node_modules[\\/]zod[\\/]/,
            },
            {
              name: 'sentry-vendor',
              test: /node_modules[\\/]@sentry[\\/]/,
            },
          ],
        },
      },
    },
  },
});
