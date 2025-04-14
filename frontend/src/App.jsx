import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'

// API base URL
const API_URL = 'http://localhost:3000/api';

function App() {
  const [instances, setInstances] = useState([])
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${API_URL}/initial-data`);
        const data = await response.json();
        setInstances(data.instances);
        setRooms(data.rooms);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (isLoading) return;

    const pollInterval = setInterval(async () => {
      try {
        // Poll for instance updates
        const instancesResponse = await fetch(`${API_URL}/instances`);
        const instancesData = await instancesResponse.json();
        setInstances(instancesData);

        // Poll for room updates
        const roomsResponse = await fetch(`${API_URL}/rooms`);
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isLoading]);

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
        setRooms(data.rooms); // Update with server response to ensure consistency
      }
    } catch (error) {
      console.error('Error adding instance to room:', error);
      // Could add error handling and rollback UI state here
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
        setRooms(data.rooms); // Update with server response to ensure consistency
      }
    } catch (error) {
      console.error('Error removing instance from room:', error);
      // Could add error handling and rollback UI state here
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
        // Update the specific instance with the server response
        setInstances(prevInstances => 
          prevInstances.map(instance => 
            instance.id === instanceId ? data.instance : instance
          )
        );
      }
    } catch (error) {
      console.error('Error updating instance title:', error);
      // Could add error handling and rollback UI state here
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Dashboard 
            instances={instances} 
            rooms={rooms}
            onAddToRoom={addToRoom}
            onRemoveFromRoom={removeFromRoom}
            onEditInstanceTitle={editInstanceTitle}
          />
        )}
      </main>
    </div>
  )
}

export default App