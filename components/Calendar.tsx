import React, { useState, useEffect, useMemo } from 'react';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import { GoogleCalendarEvent } from '../types';

interface CalendarProps {
  selectedDate: Date;
  setDate: (date: Date) => void;
  datesWithTasks: Set<string>;
  datesWithAllTasksCompleted: Set<string>;
  calendarEvents: GoogleCalendarEvent[];
}

// Helper to format date as YYYY-MM-DD key
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Calendar: React.FC<CalendarProps> = ({ selectedDate, setDate, datesWithTasks, datesWithAllTasksCompleted, calendarEvents }) => {
  // Set the view date to the month of the selected date whenever it changes
  const [viewDate, setViewDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const datesWithGCalEvents = useMemo(() => {
      const dates = new Set<string>();
      calendarEvents.forEach(event => {
          const dateStr = event.start.dateTime ? event.start.dateTime.split('T')[0] : event.start.date;
          if (dateStr) dates.add(dateStr);
      });
      return dates;
  }, [calendarEvents]);


  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    
    // In Spanish locale, week starts on Monday, but getDay() is 0 for Sunday. Adjust for Monday start.
    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-start-${i}`} className="w-7 h-7"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const currentDateKey = formatDateKey(currentDate);
      const isToday = formatDateKey(new Date()) === currentDateKey;
      const isSelected = formatDateKey(selectedDate) === currentDateKey;
      const hasTasks = datesWithTasks.has(currentDateKey);
      const hasAllTasksCompleted = datesWithAllTasksCompleted.has(currentDateKey);
      const hasGCalEvent = datesWithGCalEvents.has(currentDateKey);


      const dayClasses = [
        "w-7 h-7 flex items-center justify-center",
        "rounded-full cursor-pointer transition-colors duration-200 relative text-sm"
      ];
      
      if (isSelected) {
        dayClasses.push("bg-primary text-white font-bold shadow-md");
      } else if (isToday) {
        dayClasses.push("bg-secondary-light text-secondary-dark font-semibold");
      } else {
        dayClasses.push("hover:bg-primary-light text-gray-700");
      }

      days.push(
        <div key={day} className={dayClasses.join(' ')} onClick={() => setDate(currentDate)}>
          {day}
          <div className="absolute bottom-1 flex items-center justify-center gap-0.5 w-full">
            {!isSelected && hasGCalEvent && <div className="w-1 h-1 bg-blue-400 rounded-full"></div>}
            {!isSelected && hasAllTasksCompleted && <div className="w-1 h-1 bg-secondary rounded-full"></div>}
            {!isSelected && !hasAllTasksCompleted && hasTasks && <div className="w-1 h-1 bg-primary rounded-full"></div>}
          </div>
        </div>
      );
    }

    return days;
  };

  const weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <div className="px-2 select-none flex flex-col justify-center">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-primary-dark dark:text-primary">
            {viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-primary-light/50" aria-label="Mes anterior">
              <ChevronLeftIcon />
            </button>
            <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-primary-light/50" aria-label="Mes siguiente">
              <ChevronRightIcon />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center">
          {weekdays.map(day => (
            <div key={day} className="text-xs font-bold text-gray-400">{day}</div>
          ))}
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  );
};

export default Calendar;