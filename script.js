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
    } else {
      // Make sure the due section exists in existing data
      const tasks = JSON.parse(localStorage.getItem("tasks"))
      if (!tasks.due) {
        tasks.due = []
        localStorage.setItem("tasks", JSON.stringify(tasks))
      }

      // Migrate existing tasks to support subtasks if needed
      let needsMigration = false
      Object.keys(tasks).forEach((section) => {
        tasks[section].forEach((task) => {
          if (!task.subtasks) {
            task.subtasks = []
            needsMigration = true
          }
        })
      })

      if (needsMigration) {
        localStorage.setItem("tasks", JSON.stringify(tasks))
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

    // Set up task check intervals
    setupTaskChecks()

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

    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Add new task to the current section
    tasks[currentSection].push({
      id: Date.now().toString(),
      text: taskText,
      completed: false,
      priority: selectedPriority,
      createdAt: new Date().toISOString(),
      subtasks: [], // Initialize empty subtasks array
    })

    // Save tasks to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Clear input
    taskInput.value = ""

    // Render tasks
    renderTasks()
  }

  // Add a subtask to a task
  function addSubtask(taskId, subtaskText) {
    if (subtaskText.trim() === "") return

    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Find the task
    const task = tasks[currentSection].find((t) => t.id === taskId)

    if (task) {
      // Add the subtask
      task.subtasks.push({
        id: Date.now().toString(),
        text: subtaskText,
        completed: false,
      })

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasks))

      // Render tasks
      renderTasks()
    }
  }

  // Toggle subtask completion
  function toggleSubtaskCompletion(taskId, subtaskId) {
    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Find the task
    const task = tasks[currentSection].find((t) => t.id === taskId)

    if (task) {
      // Find the subtask
      const subtask = task.subtasks.find((st) => st.id === subtaskId)

      if (subtask) {
        // Toggle completion
        subtask.completed = !subtask.completed

        // Check if all subtasks are completed
        const allSubtasksCompleted = task.subtasks.length > 0 && task.subtasks.every((st) => st.completed)

        // Update task completion based on subtasks if there are any
        if (task.subtasks.length > 0) {
          task.completed = allSubtasksCompleted
        }

        // Save tasks to localStorage
        localStorage.setItem("tasks", JSON.stringify(tasks))

        // Render tasks
        renderTasks()
      }
    }
  }

  // Delete a subtask
  function deleteSubtask(taskId, subtaskId) {
    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Find the task
    const task = tasks[currentSection].find((t) => t.id === taskId)

    if (task) {
      // Remove the subtask
      task.subtasks = task.subtasks.filter((st) => st.id !== subtaskId)

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasks))

      // Render tasks
      renderTasks()
    }
  }

  // Render tasks for the current section
  function renderTasks() {
    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))
    const sectionTasks = tasks[currentSection]

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
          <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
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

      tasksList.appendChild(taskItem)
    })
  }

  // Toggle task completion
  function toggleTaskCompletion(taskId) {
    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Find the task and toggle its completion status
    const task = tasks[currentSection].find((task) => task.id === taskId)
    if (task) {
      task.completed = !task.completed

      // If task is marked as completed, mark all subtasks as completed too
      if (task.completed && task.subtasks) {
        task.subtasks.forEach((subtask) => {
          subtask.completed = true
        })
      }

      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasks))

      // Render tasks
      renderTasks()
    }
  }

  // Delete a task
  function deleteTask(taskId) {
    // Get tasks from localStorage
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Remove the task
    tasks[currentSection] = tasks[currentSection].filter((task) => task.id !== taskId)

    // Save tasks to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Render tasks
    renderTasks()
  }

  // Set up task check intervals
  function setupTaskChecks() {
    // Check every minute if we need to run any of our scheduled tasks
    setInterval(checkScheduledTasks, 60000) // Check every minute

    // Also run once on initialization to handle any missed checks
    checkScheduledTasks()
  }

  // Check if any scheduled tasks need to run
  function checkScheduledTasks() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const day = now.getDay() // 0 = Sunday, 1 = Monday, ...
    const date = now.getDate()
    const month = now.getMonth() // 0-11
    const year = now.getFullYear()

    // Get the last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

    // Get the last day of the year
    const isLastDayOfYear = month === 11 && date === 31

    // Check for 11:59 PM (for moving incomplete tasks to due)
    if (hours === 23 && minutes === 59 && seconds < 30) {
      // Daily check - move incomplete tasks from today to due
      moveIncompleteTasks("today")

      // Monday check - move incomplete tasks from week
      if (day === 1) {
        // Monday
        moveIncompleteTasks("week")
      }

      // Last day of month check
      if (date === lastDayOfMonth) {
        moveIncompleteTasks("month")
      }

      // Last day of year check
      if (isLastDayOfYear) {
        moveIncompleteTasks("year")
      }
    }

    // Check for 11:59:30 PM (for overwriting today with tomorrow)
    if (hours === 23 && minutes === 59 && seconds >= 30) {
      overwriteTodayWithTomorrow()
    }
  }

  // Move incomplete tasks from a section to the due section
  function moveIncompleteTasks(section) {
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Find incomplete tasks
    const incompleteTasks = tasks[section].filter((task) => !task.completed)

    // Add source information to the tasks
    incompleteTasks.forEach((task) => {
      task.sourceSection = section
      task.movedToDueAt = new Date().toISOString()
    })

    // Add incomplete tasks to the due section
    tasks.due = [...tasks.due, ...incompleteTasks]

    // Remove incomplete tasks from the original section
    tasks[section] = tasks[section].filter((task) => task.completed)

    // Save updated tasks
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Re-render if we're currently viewing the affected section
    if (currentSection === section || currentSection === "due") {
      renderTasks()
    }
  }

  // Overwrite today's tasks with tomorrow's tasks and clear tomorrow
  function overwriteTodayWithTomorrow() {
    const tasks = JSON.parse(localStorage.getItem("tasks"))

    // Overwrite today with tomorrow
    tasks.today = [...tasks.tomorrow]

    // Clear tomorrow
    tasks.tomorrow = []

    // Save updated tasks
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Re-render if we're currently viewing today or tomorrow
    if (currentSection === "today" || currentSection === "tomorrow") {
      renderTasks()
    }
  }
})

