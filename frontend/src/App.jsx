import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import LoadingSpinner from './components/LoadingSpinner'
import { FaSync } from '@react-icons/all-files/fa/FaSync'
import { apiService } from './services/api'
import { useAuth } from './context/AuthContext'

function App() {
  const [simulators, setSimulators] = useState([])
  const [awaitingSimulators, setAwaitingSimulators] = useState([])
  const [rooms, setRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { isAuthenticated } = useAuth()

  // Create a reusable function to fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await apiService.fetchHeartbeat();
      const data = response.data;

      // Separate simulators by status
      const activeSimulators = data.simulators.filter(sim => sim.status !== 'awaiting');
      const awaiting = data.simulators.filter(sim => sim.status === 'awaiting');
      
      setSimulators(activeSimulators);
      setAwaitingSimulators(awaiting);
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
    // Only fetch if authenticated
    if (isAuthenticated()) {
      fetchData();
    } else {
      setIsLoading(false); // Stop loading if not authenticated
    }
  }, [fetchData, isAuthenticated]);

  // Poll for updates every 20 seconds
  useEffect(() => {
    if (isLoading || !isAuthenticated()) return;

    const pollInterval = setInterval(() => {
      fetchData();
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [isLoading, fetchData, isAuthenticated]);

  const addToRoom = async (simulatorId, roomId) => {
    // First update local state for immediate UI feedback
    const updatedRooms = rooms.map(room => ({
      ...room,
      simulators: room.simulators?.filter(id => id !== simulatorId) || []
    }));

    setRooms(updatedRooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          simulators: [...(room.simulators || []), simulatorId]
        };
      }
      return room;
    }));

    // Then send API request
    try {
      const response = await apiService.addSimulatorToRoom(simulatorId, roomId);

      if (response.data.success) {
        // Refresh all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error adding simulator to room:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  const removeFromRoom = async (simulatorId, roomId) => {
    // First update local state for immediate UI feedback
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        // Handle both possible field names and guard against undefined
        const simulators = room.simulators || room.simulatorIds || [];
        return {
          ...room,
          simulators: simulators.filter(id => id !== simulatorId)
        };
      }
      return room;
    }));

    // Then send API request
    try {
      const response = await apiService.removeSimulatorFromRoom(simulatorId, roomId);

      if (response.data.success) {
        // Refresh all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing simulator from room:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  const editSimulatorTitle = async (simulatorId, newTitle) => {
    // First update local state for immediate UI feedback
    setSimulators(simulators.map(simulator =>
      simulator.id === simulatorId
        ? { ...simulator, title: newTitle }
        : simulator
    ));

    // Then send API request
    try {
      const response = await apiService.updateSimulatorTitle(simulatorId, newTitle);

      if (response.data.success) {
        // Update all data to ensure consistency
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating simulator title:', error);
      // Refresh data to revert to server state in case of error
      await fetchData();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar simulators={simulators} awaitingSimulators={awaitingSimulators} />
      <main className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <>
            <div className="absolute top-4 right-4 z-10">
              <button
                className={`p-2 rounded-full bg-primary text-primary-foreground ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}
                onClick={refreshData}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <FaSync className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <Dashboard
              simulators={simulators}
              rooms={rooms}
              onAddToRoom={addToRoom}
              onRemoveFromRoom={removeFromRoom}
              onEditSimulatorTitle={editSimulatorTitle}
              refreshData={refreshData}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;