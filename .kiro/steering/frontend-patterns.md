---
inclusion: fileMatch
fileMatchPattern: "**/frontend/**/*,**/src/**/*.tsx,**/src/**/*.ts"
---

# Frontend Development Patterns

## React Component Structure

### Functional Components with TypeScript
```typescript
interface ComponentProps {
  categoryId: string;
  onComplete?: () => void;
}

export const MyComponent: React.FC<ComponentProps> = ({ categoryId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  
  useEffect(() => {
    fetchData();
  }, [categoryId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories/${categoryId}/data`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      {loading ? <LoadingSpinner /> : <DataDisplay data={data} />}
    </div>
  );
};
```

### State Management Patterns
- Use **useState** for local component state
- Use **useContext** for shared state (Auth, Theme, Tour, Error)
- Use **useEffect** for side effects and data fetching
- Use **useCallback** for memoized callbacks
- Use **useMemo** for expensive computations

## API Integration

### API Service Pattern
```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export default api;
```

### API Call Pattern in Components
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await api.post('/endpoint', data);
    // Handle success
  } catch (err) {
    setError('Operation failed. Please try again.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

## Context Patterns

### Auth Context
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Theme Context (Dark Mode)
```typescript
// contexts/ThemeContext.tsx
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Usage in components
const { isDarkMode } = useTheme();
const bgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';
```

## Routing Patterns

### React Router Setup
```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/category/:categoryId" element={<CategoryDashboard />} />
        <Route path="/category/:categoryId/quiz" element={<QuizPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Protected Routes
```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};
```

## Styling with Tailwind CSS

### Common Patterns
```typescript
// Container
<div className="container mx-auto px-4 py-6">

// Card
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

// Button
<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">

// Input
<input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Dark Mode Support
```typescript
// Always include dark mode variants
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

## Form Handling

### Controlled Components
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  color: '#3B82F6'
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

<input
  name="name"
  value={formData.name}
  onChange={handleChange}
/>
```

## Loading States & Error Handling

### Loading Indicators
```typescript
{loading && (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)}
```

### Error Display
```typescript
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
    {error}
  </div>
)}
```

### Empty States
```typescript
{!loading && data.length === 0 && (
  <div className="text-center py-12">
    <p className="text-gray-500">No items found</p>
  </div>
)}
```

## TypeScript Best Practices

### Type Definitions
```typescript
// types/index.ts
export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'written_answer' | 'fill_in_blank';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  tags?: string[];
  rating: number;
}
```

### API Response Types
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Usage
const response = await api.get<ApiResponse<Category[]>>('/categories');
const categories = response.data.data;
```

## Performance Optimization

### Memoization
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Lazy Loading
```typescript
const QuizPage = lazy(() => import('./pages/QuizPage'));

<Suspense fallback={<LoadingSpinner />}>
  <QuizPage />
</Suspense>
```
