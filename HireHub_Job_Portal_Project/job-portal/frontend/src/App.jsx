import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import {Home,Jobs,JobDetails,AuthPage,About} from './pages/PublicPages';
import {Dashboard,ProfilePage,CompanyPage,EmployerJobs,ApplicantsPage,ApplicationsPage,AdminUsers,AdminJobs,AdminApplications} from './pages/DashboardPages';
import './styles.css';

function AppRoutes(){return <Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="jobs" element={<Jobs/>}/><Route path="jobs/:id" element={<JobDetails/>}/><Route path="about" element={<About/>}/><Route path="login" element={<AuthPage mode="login"/>}/><Route path="login/:role" element={<AuthPage mode="login"/>}/><Route path="register" element={<AuthPage mode="register"/>}/><Route path="register/:role" element={<AuthPage mode="register"/>}/>
<Route element={<ProtectedRoute/>}><Route path="dashboard" element={<Dashboard/>}/></Route>
<Route element={<ProtectedRoute roles={['job_seeker']}/>}><Route path="profile" element={<ProfilePage/>}/><Route path="applications" element={<ApplicationsPage/>}/></Route>
<Route element={<ProtectedRoute roles={['employer']}/>}><Route path="company" element={<CompanyPage/>}/><Route path="employer/jobs" element={<EmployerJobs/>}/><Route path="employer/jobs/:jobId/applicants" element={<ApplicantsPage/>}/></Route>
<Route element={<ProtectedRoute roles={['admin']}/>}><Route path="admin/users" element={<AdminUsers/>}/><Route path="admin/jobs" element={<AdminJobs/>}/><Route path="admin/applications" element={<AdminApplications/>}/></Route>
<Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
export default function App(){return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter>}
