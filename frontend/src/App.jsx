import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import { FaSync } from '@react-icons/all-files/fa/FaSync'

// API base URL
const API_URL = 'http://localhost:3000/api';

function App() {
  const [instances, setInstances] = useState([])
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Create a reusable function to fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`${API_URL}/heartbeat`);
      const data = await response.json();
      setInstances(data.instances);
      setRooms(data.rooms);
      setIsLoading(false);
      setIsRefreshing(false);
      return { success: true };
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsRefreshing(false);
      return { success: false, error };
    }
  }, []);

  // Function to manually refresh data
  const refreshData = useCallback(async () => {
    return await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (isLoading) return;

    const pollInterval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isLoading, fetchData]);

  const addToRoom = async (instanceId, roomId) => {
    // First update local state for immediate UI feedback
    const updatedRooms = rooms.map(room => ({
      ...room,
      instances: room.instances.filter(id => id !== instanceId)
    }));
    
    setRooms(updatedRooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          instances: [...room.instances, instanceId]
        };
      }
      return room;
    }));

    // Then send API request
    try {
      const response = await fetch(`${API_URL}/rooms/add-instance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId, roomId }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Rather than just updating rooms directly, refresh all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error adding instance to room:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  const removeFromRoom = async (instanceId, roomId) => {
    // First update local state for immediate UI feedback
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          instances: room.instances.filter(id => id !== instanceId)
        };
      } else if (room.id === 'unassigned') {
        // Add to unassigned room when removed from another room
        return {
          ...room,
          instances: [...room.instances, instanceId]
        };
      }
      return room;
    }));

    // Then send API request
    try {
      const response = await fetch(`${API_URL}/rooms/remove-instance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId, roomId }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing instance from room:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  const editInstanceTitle = async (instanceId, newTitle) => {
    // First update local state for immediate UI feedback
    setInstances(instances.map(instance => 
      instance.id === instanceId 
        ? { ...instance, title: newTitle } 
        : instance
    ));

    // Then send API request
    try {
      const response = await fetch(`${API_URL}/instances/update-title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceId, title: newTitle }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating instance title:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="absolute top-4 right-4 z-10">
              <button 
                className={`p-2 rounded-full bg-primary text-white ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                onClick={refreshData}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <FaSync className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <Dashboard 
              instances={instances} 
              rooms={rooms}
              onAddToRoom={addToRoom}
              onRemoveFromRoom={removeFromRoom}
              onEditInstanceTitle={editInstanceTitle}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App