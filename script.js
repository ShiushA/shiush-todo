document.addEventListener("DOMContentLoaded", () => {
  // DOM elements and state
  const elements = {
    sectionButtons: document.querySelectorAll(".section-btn"),
    taskInput: document.getElementById("taskInput"),
    addTaskBtn: document.getElementById("addTaskBtn"),
    tasksList: document.getElementById("tasksList"),
    currentSectionTitle: document.getElementById("currentSection")
  }
  
  let currentSection = "today"
  let tasksCache = null

  // Initialize app
  initializeApp()
  
  // Event listeners for section buttons
  elements.sectionButtons.forEach(button => {
    button.addEventListener("click", () => {
      elements.sectionButtons.forEach(btn => btn.classList.remove("active"))
      button.classList.add("active")
      currentSection = button.dataset.section
      elements.currentSectionTitle.textContent = button.textContent
      renderTasks()
    })
  })

  // Event listeners for adding tasks
  elements.addTaskBtn.addEventListener("click", addTask)
  elements.taskInput.addEventListener("keypress", e => { if (e.key === "Enter") addTask() })

  // ===== Core Functions =====

  function initializeApp() {
    // Load or initialize tasks
    if (!localStorage.getItem("tasks")) {
      tasksCache = { today: [], tomorrow: [], week: [], month: [], year: [], due: [] }
      localStorage.setItem("tasks", JSON.stringify(tasksCache))
    } else {
      tasksCache = JSON.parse(localStorage.getItem("tasks"))
      
      // Ensure due section exists
      if (!tasksCache.due) tasksCache.due = []
      
      // Migrate tasks to support subtasks if needed
      let needsMigration = false
      Object.keys(tasksCache).forEach(section => {
        tasksCache[section].forEach(task => {
          if (!task.subtasks) {
            task.subtasks = []
            needsMigration = true
          }
        })
      })
      if (needsMigration) localStorage.setItem("tasks", JSON.stringify(tasksCache))
    }

    // Check for missed task movements
    checkMissedTaskMovements()
    renderTasks()
  }

  function addTask() {
    const taskText = elements.taskInput.value.trim()
    if (taskText === "") return

    // Get selected priority
    let selectedPriority = "main"
    document.getElementsByName("priority").forEach(radio => {
      if (radio.checked) selectedPriority = radio.value
    })

    // Add new task
    tasksCache[currentSection].push({
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      priority: selectedPriority,
      createdAt: new Date().toISOString(),
      subtasks: []
    })

    saveToLocalStorage()
    elements.taskInput.value = ""
    renderTasks()
  }

  function renderTasks() {
    const sectionTasks = tasksCache[currentSection]
    
    // Sort tasks: incomplete first, then by priority
    sectionTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const priorityOrder = { main: 0, sub: 1, minor: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    elements.tasksList.innerHTML = ""
    const fragment = document.createDocumentFragment()

    sectionTasks.forEach(task => {
      const taskItem = createTaskElement(task)
      fragment.appendChild(taskItem)
    })

    elements.tasksList.appendChild(fragment)
  }

  function createTaskElement(task) {
    const taskItem = document.createElement("div")
    taskItem.classList.add("task-item", `task-priority-${task.priority}`)
    if (task.completed) taskItem.classList.add("completed")

    // Calculate subtask progress
    let subtaskProgress = ""
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSubtasks = task.subtasks.filter(st => st.completed).length
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
          ${task.subtasks.map(subtask => `
            <div class="subtask-item ${subtask.completed ? "completed" : ""}">
              <input type="checkbox" class="subtask-checkbox" data-subtask-id="${subtask.id}" ${subtask.completed ? "checked" : ""}>
              <span class="subtask-text">${subtask.text}</span>
              <button class="subtask-delete" data-subtask-id="${subtask.id}">❌</button>
            </div>
          `).join("")}
        </div>
        <div class="add-subtask-container">
          <input type="text" class="add-subtask-input" placeholder="Add a subtask...">
          <button class="add-subtask-btn">Add</button>
        </div>
      </div>
    `

    // Add event listeners
    addTaskEventListeners(taskItem, task.id)
    return taskItem
  }

  function addTaskEventListeners(taskItem, taskId) {
    // Task checkbox
    taskItem.querySelector(".task-checkbox").addEventListener("change", () => {
      toggleTaskCompletion(taskId)
    })

    // Delete button
    taskItem.querySelector(".task-delete").addEventListener("click", () => {
      deleteTask(taskId)
    })

    // Subtask toggle button
    const toggleBtn = taskItem.querySelector(".task-toggle-subtasks")
    const container = taskItem.querySelector(".subtasks-container")
    toggleBtn.addEventListener("click", () => {
      const isHidden = container.style.display === "none"
      container.style.display = isHidden ? "block" : "none"
      toggleBtn.textContent = isHidden ? "▲" : "▼"
    })

    // Add subtask button
    taskItem.querySelector(".task-add-subtask").addEventListener("click", () => {
      container.style.display = "block"
      toggleBtn.textContent = "▲"
      taskItem.querySelector(".add-subtask-input").focus()
    })

    // Add subtask input and button
    const input = taskItem.querySelector(".add-subtask-input")
    const addBtn = taskItem.querySelector(".add-subtask-btn")
    
    addBtn.addEventListener("click", () => {
      addSubtask(taskId, input.value)
      input.value = ""
    })

    input.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        addSubtask(taskId, input.value)
        input.value = ""
      }
    })

    // Subtask checkboxes
    taskItem.querySelectorAll(".subtask-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        toggleSubtaskCompletion(taskId, checkbox.dataset.subtaskId)
      })
    })

    // Subtask delete buttons
    taskItem.querySelectorAll(".subtask-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteSubtask(taskId, btn.dataset.subtaskId)
      })
    })
  }

  // ===== Task Operations =====

  function toggleTaskCompletion(taskId) {
    const task = findTaskById(taskId)
    if (!task) return
    
    task.completed = !task.completed
    
    // Update subtasks and completion timestamp
    if (task.completed) {
      task.subtasks.forEach(subtask => { subtask.completed = true })
      task.completedAt = new Date().toISOString()
    } else {
      delete task.completedAt
    }
    
    saveToLocalStorage()
    renderTasks()
  }

  function deleteTask(taskId) {
    tasksCache[currentSection] = tasksCache[currentSection].filter(task => task.id !== taskId)
    saveToLocalStorage()
    renderTasks()
  }

  function addSubtask(taskId, subtaskText) {
    if (subtaskText.trim() === "") return
    
    const task = findTaskById(taskId)
    if (!task) return
    
    task.subtasks.push({
      id: Date.now().toString(),
      text: subtaskText,
      completed: false
    })
    
    saveToLocalStorage()
    renderTasks()
  }

  function toggleSubtaskCompletion(taskId, subtaskId) {
    const task = findTaskById(taskId)
    if (!task) return
    
    const subtask = task.subtasks.find(st => st.id === subtaskId)
    if (!subtask) return
    
    // Store open states
    const openStates = storeSubtaskContainerStates()
    
    // Toggle completion
    subtask.completed = !subtask.completed
    
    // Update task completion if all subtasks are completed
    if (task.subtasks.length > 0) {
      task.completed = task.subtasks.every(st => st.completed)
      if (task.completed) task.completedAt = new Date().toISOString()
      else delete task.completedAt
    }
    
    saveToLocalStorage()
    renderTasks()
    
    // Restore open states
    restoreSubtaskContainerStates(openStates)
  }

  function deleteSubtask(taskId, subtaskId) {
    const task = findTaskById(taskId)
    if (!task) return
    
    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId)
    saveToLocalStorage()
    renderTasks()
  }

  // ===== Time-based Operations =====

  function checkMissedTaskMovements() {
    const now = new Date()
    const lastOpenedTimestamp = localStorage.getItem("lastOpenedTimestamp")
    
    // First time opening the app
    if (!lastOpenedTimestamp) {
      localStorage.setItem("lastOpenedTimestamp", now.getTime().toString())
      return
    }
    
    const lastOpened = new Date(parseInt(lastOpenedTimestamp))
    const daysPassed = getDaysBetweenDates(lastOpened, now)
    
    // Process daily tasks
    if (daysPassed >= 1) {
      // Delete completed tasks first
      deleteCompletedTasks("due", 24 * 60 * 60 * 1000)
      deleteCompletedTasks("tomorrow", 24 * 60 * 60 * 1000)
      deleteCompletedTasks("today", 24 * 60 * 60 * 1000)
      
      // Process daily tasks
      if (daysPassed === 1) {
        moveIncompleteTasks("today")
        tasksCache.today = [...tasksCache.tomorrow]
        tasksCache.tomorrow = []
      } else {
        moveIncompleteTasks("today")
        moveIncompleteTasks("tomorrow")
        tasksCache.today = []
        tasksCache.tomorrow = []
      }
    }
    
    // Weekly, monthly, yearly tasks
    if (hasCrossedMonday(lastOpened, now)) {
      deleteCompletedTasks("week", 7 * 24 * 60 * 60 * 1000)
      moveIncompleteTasks("week")
    }
    
    if (hasCrossedMonthEnd(lastOpened, now)) {
      deleteCompletedTasks("month", 30 * 24 * 60 * 60 * 1000)
      moveIncompleteTasks("month")
    }
    
    if (hasCrossedYearEnd(lastOpened, now)) {
      deleteCompletedTasks("year", 365 * 24 * 60 * 60 * 1000)
      moveIncompleteTasks("year")
    }
    
    saveToLocalStorage()
    localStorage.setItem("lastOpenedTimestamp", now.getTime().toString())
  }

  function deleteCompletedTasks(section, timeThreshold) {
    const now = new Date()
    
    tasksCache[section] = tasksCache[section].filter(task => {
      if (!task.completed) return true
      if (!task.completedAt) return true
      
      const completedAt = new Date(task.completedAt)
      return (now.getTime() - completedAt.getTime()) < timeThreshold
    })
    
    if (currentSection === section) renderTasks()
  }

  function moveIncompleteTasks(section) {
    const incompleteTasks = tasksCache[section].filter(task => !task.completed)
    
    if (incompleteTasks.length > 0) {
      tasksCache.due = [...tasksCache.due, ...incompleteTasks.map(task => ({
        ...task,
        sourceSection: section,
        movedToDueAt: new Date().toISOString()
      }))]
      
      tasksCache[section] = tasksCache[section].filter(task => task.completed)
      
      if (currentSection === section || currentSection === "due") renderTasks()
    }
  }

  // ===== Helper Functions =====

  function findTaskById(taskId) {
    return tasksCache[currentSection].find(task => task.id === taskId)
  }

  function saveToLocalStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasksCache))
  }

  function storeSubtaskContainerStates() {
    const openStates = {}
    document.querySelectorAll(".task-item").forEach(item => {
      const taskId = item.querySelector(".task-checkbox").dataset.taskId
      const container = item.querySelector(".subtasks-container")
      if (container) openStates[taskId] = container.style.display === "block"
    })
    return openStates
  }

  function restoreSubtaskContainerStates(openStates) {
    document.querySelectorAll(".task-item").forEach(item => {
      const taskId = item.querySelector(".task-checkbox").dataset.taskId
      if (openStates[taskId]) {
        const container = item.querySelector(".subtasks-container")
        const toggleBtn = item.querySelector(".task-toggle-subtasks")
        if (container && toggleBtn) {
          container.style.display = "block"
          toggleBtn.textContent = "▲"
        }
      }
    })
  }

  function getDaysBetweenDates(startDate, endDate) {
    const start = new Date(startDate), end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return Math.floor(Math.abs(end - start) / (1000 * 60 * 60 * 24))
  }

  function hasCrossedMonday(startDate, endDate) {
    if (startDate.getTime() === endDate.getTime()) return false
    if (startDate.getDay() === 1 && startDate.getDate() !== endDate.getDate()) return true
    
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + 1)
    
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 1) return true
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return false
  }

  function hasCrossedMonthEnd(startDate, endDate) {
    return startDate.getMonth() !== endDate.getMonth() || 
           startDate.getFullYear() !== endDate.getFullYear()
  }

  function hasCrossedYearEnd(startDate, endDate) {
    return startDate.getFullYear() !== endDate.getFullYear()
  }
})