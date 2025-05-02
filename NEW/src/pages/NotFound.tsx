import { Link } from 'react-router-dom';
import { Button } from '../../src/components/ui/button';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
        404 - Page Not Found
      </h1>
      <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-md text-center">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/">
          <Button variant="default" size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Go to Party Page
          </Button>
        </Link>
        <Link to="/map">
          <Button variant="outline" size="lg">
            Go to Map
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
