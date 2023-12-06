import Meta from '../components/common/Meta'
import Scaffolding from '../components/common/Scaffolding'
import dynamic from 'next/dynamic'

const AskDefogChat = dynamic(() => import("defog-components").then(module => module.AskDefogChat), {
  ssr: false,
});


const QueryDatabase = () => {
  return (
    <>
      <Meta />
      <Scaffolding id={"query-database"}>
        <h1>Query your database</h1>
        <AskDefogChat
          maxWidth={"100%"}
          height={"80vh"}
          apiEndpoint="http://localhost:8000/query_db"
          buttonText={"Ask Defog"}
          darkMode={false}
          debugMode={true}
        />
      </Scaffolding>
    </>
  )
}

export default QueryDatabase;