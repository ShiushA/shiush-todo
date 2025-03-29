// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const sectionButtons = document.querySelectorAll(".section-btn")
  const taskInput = document.getElementById("taskInput")
  const addTaskBtn = document.getElementById("addTaskBtn")
  const tasksList = document.getElementById("tasksList")
  const currentSectionTitle = document.getElementById("currentSection")

  // Current active section
  let currentSection = "today"

  // Cache for tasks to reduce localStorage reads
  let tasksCache = null

  // Initialize the app
  init()

  // Add event listeners
  sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active section
      sectionButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")

      // Update current section
      currentSection = button.dataset.section
      currentSectionTitle.textContent = button.textContent

      // Render tasks for the selected section
      renderTasks()
    })
  })

  addTaskBtn.addEventListener("click", addTask)
  taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTask()
    }
  })

  // Initialize the app
  function init() {
    // Load tasks from localStorage
    if (!localStorage.getItem("tasks")) {
      // Initialize with empty tasks for each section
      const initialTasks = {
        today: [],
        tomorrow: [],
        week: [],
        month: [],
        year: [],
        due: [], // Add due tasks section
      }
      localStorage.setItem("tasks", JSON.stringify(initialTasks))
      tasksCache = initialTasks
    } else {
      // Load tasks into cache
      tasksCache = JSON.parse(localStorage.getItem("tasks"))

      // Make sure the due section exists in existing data
      if (!tasksCache.due) {
        tasksCache.due = []
        localStorage.setItem("tasks", JSON.stringify(tasksCache))
      }

      // Migrate existing tasks to support subtasks if needed
      let needsMigration = false
      Object.keys(tasksCache).forEach((section) => {
        tasksCache[section].forEach((task) => {
          if (!task.subtasks) {
            task.subtasks = []
            needsMigration = true
          }
        })
      })

      if (needsMigration) {
        localStorage.setItem("tasks", JSON.stringify(tasksCache))
      }
    }

    // Add due tasks button if it doesn't exist
    if (!document.querySelector('[data-section="due"]')) {
      const timeSections = document.querySelector(".time-sections")
      const dueButton = document.createElement("button")
      dueButton.classList.add("section-btn")
      dueButton.dataset.section = "due"
      dueButton.textContent = "Due Tasks"
      timeSections.appendChild(dueButton)

      // Add event listener to the new button
      dueButton.addEventListener("click", () => {
        sectionButtons.forEach((btn) => btn.classList.remove("active"))
        dueButton.classList.add("active")
        currentSection = "due"
        currentSectionTitle.textContent = "Due Tasks"
        renderTasks()
      })
    }

    // Check for missed task movements based on last opened time
    checkMissedTaskMovements()

    // Render tasks for the current section
    renderTasks()
  }

  // Add a new task
  function addTask() {
    const taskText = taskInput.value.trim()
    if (taskText === "") return

    // Get selected priority
    const priorityRadios = document.getElementsByName("priority")
    let selectedPriority

    for (const radio of priorityRadios) {
      if (radio.checked) {
        selectedPriority = radio.value
        break
      }
    }

    // Add new task to the current section
    tasksCache[currentSection].push({
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      priority: selectedPriority,
      createdAt: new Date().toISOString(),
      subtasks: [], // Initialize empty subtasks array
    })

    // Save tasks to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasksCache))

    // Clear input
    taskInput.value = ""

    // Render tasks
    renderTasks()
  }

  // Add a subtask to a task
  function addSubtask(taskId, subtaskText) {
    if (subtaskText.trim() === "") return

    // Find the task
    const task = tasksCache[currentSection].find((t) => t.id === taskId)

    if (task) {
      // Add the subtask
      task.subtasks.push({
        id: Date.now().toString(),
        text: subtaskText,
        completed: false,
      })

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasksCache))

      // Render tasks
      renderTasks()
    }
  }

  // Toggle subtask completion
  function toggleSubtaskCompletion(taskId, subtaskId) {
    // Find the task
    const task = tasksCache[currentSection].find((t) => t.id === taskId)

    if (task) {
      // Find the subtask
      const subtask = task.subtasks.find((st) => st.id === subtaskId)

      if (subtask) {
        // Store the open states of all subtask containers before updating
        const openStates = {}
        document.querySelectorAll(".task-item").forEach((item) => {
          const taskId = item.querySelector(".task-checkbox").dataset.taskId
          const subtasksContainer = item.querySelector(".subtasks-container")
          if (subtasksContainer) {
            openStates[taskId] = subtasksContainer.style.display === "block"
          }
        })

        // Toggle completion
        subtask.completed = !subtask.completed

        // Check if all subtasks are completed
        const allSubtasksCompleted = task.subtasks.length > 0 && task.subtasks.every((st) => st.completed)

        // Update task completion based on subtasks if there are any
        if (task.subtasks.length > 0) {
          task.completed = allSubtasksCompleted
        }

        // Save tasks to localStorage
        localStorage.setItem("tasks", JSON.stringify(tasksCache))

        // Render tasks
        renderTasks()

        // Restore open states after rendering
        document.querySelectorAll(".task-item").forEach((item) => {
          const taskId = item.querySelector(".task-checkbox").dataset.taskId
          if (openStates[taskId]) {
            const subtasksContainer = item.querySelector(".subtasks-container")
            const toggleButton = item.querySelector(".task-toggle-subtasks")
            if (subtasksContainer && toggleButton) {
              subtasksContainer.style.display = "block"
              toggleButton.textContent = "▲"
            }
          }
        })
      }
    }
  }

  // Delete a subtask
  function deleteSubtask(taskId, subtaskId) {
    // Find the task
    const task = tasksCache[currentSection].find((task) => task.id === taskId)

    if (task) {
      // Remove the subtask
      task.subtasks = task.subtasks.filter((st) => st.id !== subtaskId)

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasksCache))

      // Render tasks
      renderTasks()
    }
  }

  // Render tasks for the current section - Optimized
  function renderTasks() {
    const sectionTasks = tasksCache[currentSection]

    // Sort tasks: incomplete first, then by priority (main > sub > minor)
    sectionTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }

      const priorityOrder = { main: 0, sub: 1, minor: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    // Clear tasks list
    tasksList.innerHTML = ""

    // Create document fragment for better performance
    const fragment = document.createDocumentFragment()

    // Render tasks
    sectionTasks.forEach((task) => {
      const taskItem = document.createElement("div")
      taskItem.classList.add("task-item", `task-priority-${task.priority}`)
      if (task.completed) {
        taskItem.classList.add("completed")
      }

      // Calculate subtask progress
      let subtaskProgress = ""
      if (task.subtasks && task.subtasks.length > 0) {
        const completedSubtasks = task.subtasks.filter((st) => st.completed).length
        subtaskProgress = `<span class="subtask-progress">${completedSubtasks}/${task.subtasks.length}</span>`
      }

      taskItem.innerHTML = `
        <div class="task-main">
          <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${task.completed ? "checked" : ""}>
          <span class="task-text">${task.text}</span>
          ${subtaskProgress}
          <div class="task-actions">
            <button class="task-add-subtask" title="Add Subtask">+</button>
            <button class="task-toggle-subtasks" title="Toggle Subtasks">▼</button>
            <button class="task-delete" title="Delete Task">❌</button>
          </div>
        </div>
        <div class="subtasks-container" style="display: none;">
          <div class="subtasks-list">
            ${task.subtasks
              .map(
                (subtask) => `
              <div class="subtask-item ${subtask.completed ? "completed" : ""}">
                <input type="checkbox" class="subtask-checkbox" data-subtask-id="${subtask.id}" ${subtask.completed ? "checked" : ""}>
                <span class="subtask-text">${subtask.text}</span>
                <button class="subtask-delete" data-subtask-id="${subtask.id}">❌</button>
              </div>
            `,
              )
              .join("")}
          </div>
          <div class="add-subtask-container">
            <input type="text" class="add-subtask-input" placeholder="Add a subtask...">
            <button class="add-subtask-btn">Add</button>
          </div>
        </div>
      `

      // Add event listeners for task actions
      const checkbox = taskItem.querySelector(".task-checkbox")
      checkbox.addEventListener("change", () => {
        toggleTaskCompletion(task.id)
      })

      const deleteBtn = taskItem.querySelector(".task-delete")
      deleteBtn.addEventListener("click", () => {
        deleteTask(task.id)
      })

      // Add subtask toggle functionality
      const toggleSubtasksBtn = taskItem.querySelector(".task-toggle-subtasks")
      const subtasksContainer = taskItem.querySelector(".subtasks-container")
      toggleSubtasksBtn.addEventListener("click", () => {
        const isHidden = subtasksContainer.style.display === "none"
        subtasksContainer.style.display = isHidden ? "block" : "none"
        toggleSubtasksBtn.textContent = isHidden ? "▲" : "▼"
      })

      // Add subtask button functionality
      const addSubtaskBtn = taskItem.querySelector(".task-add-subtask")
      addSubtaskBtn.addEventListener("click", () => {
        subtasksContainer.style.display = "block"
        toggleSubtasksBtn.textContent = "▲"
        taskItem.querySelector(".add-subtask-input").focus()
      })

      // Add subtask input functionality
      const addSubtaskInput = taskItem.querySelector(".add-subtask-input")
      const addSubtaskButton = taskItem.querySelector(".add-subtask-btn")

      addSubtaskButton.addEventListener("click", () => {
        addSubtask(task.id, addSubtaskInput.value)
        addSubtaskInput.value = ""
      })

      addSubtaskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          addSubtask(task.id, addSubtaskInput.value)
          addSubtaskInput.value = ""
        }
      })

      // Add event listeners for subtask actions
      const subtaskCheckboxes = taskItem.querySelectorAll(".subtask-checkbox")
      subtaskCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          toggleSubtaskCompletion(task.id, checkbox.dataset.subtaskId)
        })
      })

      const subtaskDeleteBtns = taskItem.querySelectorAll(".subtask-delete")
      subtaskDeleteBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          deleteSubtask(task.id, btn.dataset.subtaskId)
        })
      })

      fragment.appendChild(taskItem)
    })

    // Append all tasks at once for better performance
    tasksList.appendChild(fragment)
  }

  // Toggle task completion
  function toggleTaskCompletion(taskId) {
    // Find the task and toggle its completion status
    const task = tasksCache[currentSection].find((task) => task.id === taskId)
    if (task) {
      task.completed = !task.completed

      // If task is marked as completed, mark all subtasks as completed too
      if (task.completed && task.subtasks) {
        task.subtasks.forEach((subtask) => {
          subtask.completed = true
        })
      }

      // Add completedAt timestamp if the task is marked as completed
      if (task.completed) {
        task.completedAt = new Date().toISOString();
      } else {
        // Remove completedAt timestamp if the task is marked as incomplete
        delete task.completedAt;
      }

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasksCache))

      // Render tasks
      renderTasks()
    }
  }

  // Delete a task
  function deleteTask(taskId) {
    // Remove the task
    tasksCache[currentSection] = tasksCache[currentSection].filter((task) => task.id !== taskId)

    // Save tasks to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasksCache))

    // Render tasks
    renderTasks()
  }

  // Check for missed task movements based on last opened time
  function checkMissedTaskMovements() {
    const now = new Date()
    const currentTimestamp = now.getTime()

    // Get the last opened timestamp from localStorage
    const lastOpenedTimestamp = localStorage.getItem("lastOpenedTimestamp")

    // If this is the first time opening the app, just save the current timestamp and return
    if (!lastOpenedTimestamp) {
      localStorage.setItem("lastOpenedTimestamp", currentTimestamp.toString())
      console.log("First time opening app, setting initial timestamp:", new Date(currentTimestamp).toLocaleString())
      return
    }

    // Parse the last opened timestamp
    const lastOpened = new Date(Number.parseInt(lastOpenedTimestamp))
    console.log("Last opened:", lastOpened.toLocaleString())
    console.log("Current time:", now.toLocaleString())

    // Check if days have passed (for today/tomorrow tasks)
    const daysPassed = getDaysBetweenDates(lastOpened, now)
    console.log("Days passed since last opened:", daysPassed)

    if (daysPassed >= 1) {
      console.log("At least one day has passed, processing daily tasks")
      processDailyTasks(daysPassed)
      
      // Delete completed tasks in due section if a day has passed
      deleteCompletedDueTasks()
    }

    // Check if we've crossed a Monday since last opened (for weekly tasks)
    if (hasCrossedMonday(lastOpened, now)) {
      console.log("Crossed a Monday since last opened, processing weekly tasks")
      moveIncompleteTasks("week")
    }

    // Check if we've crossed a month end since last opened (for monthly tasks)
    if (hasCrossedMonthEnd(lastOpened, now)) {
      console.log("Crossed a month end since last opened, processing monthly tasks")
      moveIncompleteTasks("month")
    }

    // Check if we've crossed a year end since last opened (for yearly tasks)
    if (hasCrossedYearEnd(lastOpened, now)) {
      console.log("Crossed a year end since last opened, processing yearly tasks")
      moveIncompleteTasks("year")
    }

    // Update the last opened timestamp
    localStorage.setItem("lastOpenedTimestamp", currentTimestamp.toString())
    console.log("Updated last opened timestamp to:", new Date(currentTimestamp).toLocaleString())
  }

  // Delete completed tasks in the due section if they were completed at least a day ago
  function deleteCompletedDueTasks() {
    console.log("Checking for completed due tasks to delete")
    
    const now = new Date()
    const oneDayInMs = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    
    // Filter out completed tasks that were completed at least a day ago
    const tasksToKeep = tasksCache.due.filter(task => {
      // Keep all incomplete tasks
      if (!task.completed) return true
      
      // If task is completed but doesn't have completedAt timestamp, keep it
      if (!task.completedAt) return true
      
      // Calculate time difference between now and when the task was completed
      const completedAt = new Date(task.completedAt)
      const timeDiff = now.getTime() - completedAt.getTime()
      
      // Keep the task if it was completed less than a day ago
      return timeDiff < oneDayInMs
    })
    
    // If we removed any tasks, update the cache and localStorage
    if (tasksToKeep.length < tasksCache.due.length) {
      const removedCount = tasksCache.due.length - tasksToKeep.length
      console.log(`Removed ${removedCount} completed due tasks that were completed more than a day ago`)
      
      tasksCache.due = tasksToKeep
      localStorage.setItem("tasks", JSON.stringify(tasksCache))
      
      // Re-render if we're currently viewing the due section
      if (currentSection === "due") {
        renderTasks()
      }
    } else {
      console.log("No completed due tasks to delete")
    }
  }

  // Process daily tasks based on days passed
  function processDailyTasks(daysPassed) {
    // First, move incomplete tasks from today to due
    moveIncompleteTasks("today")

    // Then handle the tomorrow -> today transition
    if (daysPassed === 1) {
      // Simple case: just move tomorrow to today
      overwriteTodayWithTomorrow()
    } else if (daysPassed > 1) {
      // If more than one day has passed, we need to:
      // 1. Move incomplete tasks from tomorrow to due
      moveIncompleteTasks("tomorrow")
      // 2. Clear today (since those incomplete tasks were already moved to due)
      tasksCache.today = []
      // 3. Clear tomorrow (since those incomplete tasks were already moved to due)
      tasksCache.tomorrow = []

      // Save the changes
      localStorage.setItem("tasks", JSON.stringify(tasksCache))
      console.log("Cleared today and tomorrow tasks after multiple days absence")
    }
  }

  // Get the number of days between two dates
  function getDaysBetweenDates(startDate, endDate) {
    // Convert both dates to midnight for accurate day calculation
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    // Calculate the difference in days
    const diffTime = Math.abs(end - start)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // Check if we've crossed a Monday between two dates
  function hasCrossedMonday(startDate, endDate) {
    // If the dates are the same, no Monday was crossed
    if (startDate.getTime() === endDate.getTime()) return false

    // If start date is Monday and end date is a different day, we crossed a Monday
    if (startDate.getDay() === 1 && startDate.getDate() !== endDate.getDate()) return true

    // Clone the start date to avoid modifying the original
    const currentDate = new Date(startDate)

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1)

    // Check each day between start and end
    while (currentDate <= endDate) {
      // If we find a Monday, return true
      if (currentDate.getDay() === 1) {
        return true
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // No Monday found
    return false
  }

  // Check if we've crossed a month end between two dates
  function hasCrossedMonthEnd(startDate, endDate) {
    // If the dates are in the same month and year, no month end was crossed
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return false
    }

    // If the dates are in different months or years, a month end was crossed
    return true
  }

  // Check if we've crossed a year end between two dates
  function hasCrossedYearEnd(startDate, endDate) {
    // If the dates are in the same year, no year end was crossed
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return false
    }

    // If the dates are in different years, a year end was crossed
    return true
  }

  // Move incomplete tasks from a section to the due section
  function moveIncompleteTasks(section) {
    console.log(`Moving incomplete tasks from ${section} to due section`)

    // Find incomplete tasks
    const incompleteTasks = tasksCache[section].filter((task) => !task.completed)

    if (incompleteTasks.length === 0) {
      console.log(`No incomplete tasks in ${section} section`)
      return
    }

    console.log(`Found ${incompleteTasks.length} incomplete tasks in ${section} section`)

    // Create copies of the tasks with source information
    const tasksToMove = incompleteTasks.map((task) => ({
      ...task,
      sourceSection: section,
      movedToDueAt: new Date().toISOString(),
    }))

    // Add incomplete tasks to the due section
    tasksCache.due = [...tasksCache.due, ...tasksToMove]

    // Remove incomplete tasks from the original section
    tasksCache[section] = tasksCache[section].filter((task) => task.completed)

    // Save updated tasks
    localStorage.setItem("tasks", JSON.stringify(tasksCache))

    console.log(`Successfully moved tasks from ${section} to due section`)

    // Re-render if we're currently viewing the affected section
    if (currentSection === section || currentSection === "due") {
      renderTasks()
    }
  }

  // Overwrite today's tasks with tomorrow's tasks and clear tomorrow
  function overwriteTodayWithTomorrow() {
    console.log("Overwriting today's tasks with tomorrow's tasks")

    // Overwrite today with tomorrow
    tasksCache.today = [...tasksCache.tomorrow]

    // Clear tomorrow
    tasksCache.tomorrow = []

    // Save updated tasks
    localStorage.setItem("tasks", JSON.stringify(tasksCache))

    console.log("Today's tasks updated with tomorrow's tasks")

    // Re-render if we're currently viewing today or tomorrow
    if (currentSection === "today" || currentSection === "tomorrow") {
      renderTasks()
    }
  }
})