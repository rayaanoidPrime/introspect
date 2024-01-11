// create a simple login page with React, Ant Design, and Next.js

import React, { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/router'
import Meta from '../components/common/Meta'
import Scaffolding from '../components/common/Scaffolding'
import { Context } from '../components/common/Context';

const LogIn = () => {
  const [userType, setUserType] = useState("");
  const [context, setContext] = useContext(Context);
  const router = useRouter();

  useEffect(() => {
    // if userType is in context, redirect to home page
    const userType = context.userType;
    if (userType) {
      router.push("/");
      return;
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const userType = e.target.value;
    setUserType(userType);
    setContext({ userType });
    router.push("/");
  }

  return (
    <>
      <Meta />
      <Scaffolding>
        <h1 style={{paddingBottom: "1em"}}>Welcome to Defog!</h1>
        <h3>Please select your user type:</h3>
        <button value="admin" onClick={handleLogin}>Admin</button>
        <button value="general" onClick={handleLogin}>General</button>
      </Scaffolding>
    </>
  )
}

export default LogIn;