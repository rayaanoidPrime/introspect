// create a simple login page with React, Ant Design, and Next.js

import React, { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/router'
import Meta from '../components/common/Meta'
import Scaffolding from '../components/common/Scaffolding'
import { Context } from '../components/common/Context';
import { Input, Select, Form, Button, } from 'antd';

const LogIn = () => {
  const [context, setContext] = useContext(Context);
  const router = useRouter();

  const handleLogin = async (values) => {
    // TODO: handle login
    console.log(values);
    const response = await fetch("http://localhost:8000/login", {
      method: "POST",
      body: JSON.stringify(values),
    });
  }

  return (
    <>
      <Meta />
      <Scaffolding>
        <h1 style={{paddingBottom: "1em"}}>Welcome to Defog!</h1>
        {/* Login with antd components */}
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
          style={{ maxWidth: 800 }}
          onFinish={handleLogin}
        >
          <Form.Item label="Username" name="username">
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password">
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Log In</Button>
          </Form.Item>
        </Form>

      </Scaffolding>
    </>
  )
}

export default LogIn;