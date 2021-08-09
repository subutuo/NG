require('dotenv').config({path: process.env.DOTENV})
// https://developer.todoist.com/rest/v1/#updating-a-task
const axios = require('axios')
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.TODOIST_BEARER_TOKEN}`

// Get a user's projects
function getProjects() {
  return axios.get('https://api.todoist.com/rest/v1/projects').then((res) => res.data.map(({name, id}) => ({name, id})))
}

// Adding a new task
function addTask(project_id, content) {
  return axios
    .post('https://api.todoist.com/rest/v1/tasks', {content, project_id})
    .then((res) => {
      console.log(res.data)
      return res.data.id
    })
    .catch((e) => console.error(e))
}

// Updating a task
function updateTask(taskId, data) {
  return axios
    .post(`https://api.todoist.com/rest/v1/tasks/${taskId}`, data)
    .then((res) => {
      console.log(res.data)
    })
    .catch((e) => console.error(e))
}

// Completing a task
function completeTask(taskId) {
  return axios
    .post(`https://api.todoist.com/rest/v1/tasks/${taskId}/close`)
    .then((res) => {
      console.log(res.data)
    })
    .catch((e) => console.error(e))
}

;(async () => {
  const projects = await getProjects()
  const projectId = projects.slice(-1)[0].id
  const taskId = await addTask(projectId, '내용')
  await updateTask(taskId, {due_string: 'today'})
  await completeTask(taskId)
})()