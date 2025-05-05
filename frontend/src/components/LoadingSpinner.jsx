const LoadingSpinner = ({ size = 'default' }) => {
  const sizes = {
    small: 'h-4 w-4 border-2',
    default: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-3',
  };

  return (
    <div className={`animate-spin rounded-full ${sizes[size]} border-t-primary border-primary/30`}></div>
  );
};

export default LoadingSpinner;