import {createContext,useContext,useEffect,useState} from 'react';
import api from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('hirehub_user'))}catch{return null}});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{const token=localStorage.getItem('hirehub_token'); if(!token){setLoading(false);return}
    api.get('/auth/me').then(r=>setUser(r.data.user)).catch(()=>logout()).finally(()=>setLoading(false));
  },[]);
  function login(data){localStorage.setItem('hirehub_token',data.token);localStorage.setItem('hirehub_user',JSON.stringify(data.user));setUser(data.user)}
  function logout(){localStorage.removeItem('hirehub_token');localStorage.removeItem('hirehub_user');setUser(null)}
  return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
