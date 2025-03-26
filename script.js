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
        }
        localStorage.setItem("tasks", JSON.stringify(initialTasks))
      }
  
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
      })
  
      // Save tasks to localStorage
      localStorage.setItem("tasks", JSON.stringify(tasks))
  
      // Clear input
      taskInput.value = ""
  
      // Render tasks
      renderTasks()
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
  
        taskItem.innerHTML = `
                  <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
                  <span class="task-text">${task.text}</span>
                  <button class="task-delete">❌</button>
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
  })
  
  