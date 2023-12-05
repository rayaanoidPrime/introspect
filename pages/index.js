import Meta from '@/components/common/Meta'
import Scaffolding from '@/components/common/Scaffolding'
import { Row, Col, Card, Tooltip, Button } from 'antd/lib';

const QueryDatabase = () => {
  return (
    <>
      <Meta />
      <Scaffolding id={"select-model"}>
        <h1>Select Model</h1>
        <Row type="flex">
          <Col md={{span: 8}} xs={{span: 24}} style={{display: "flex"}}>
            <Card title="Locally Hosted (Community)" bordered={true}>
              🦾 Model Type: <code>SQLCoder-7b-4_k.GGUF</code> <Tooltip title="Our fastest model with 78% accuracy on `sql-eval`. Works great on Apple Silicon.">ℹ</Tooltip> <br/>
              🆓 Free forever! <Tooltip title="The model is free forever.">ℹ</Tooltip> <br/>
              🤷🏽‍♂️ Not great at following-instructions <Tooltip title="The model can follow basic instructions, but is not great at following specialized ones">ℹ</Tooltip> <br/>
              ❌ No fine tuning <Tooltip title="Model works great for simple questions that do not require specialized domain knowledge.">ℹ</Tooltip> <br/>
              👷🏽‍♂️ Limited agent access <Tooltip title="The model is very limited at solving highly complex problems requiring multiple steps.">ℹ</Tooltip> <br/>
              🔐 Complete data privacy with no data sharing

              <hr style={{marginTop: "1em", border: "1px solid rgba(0,0,0,0.1)"}} />
              <div style={{paddingBottom: "2em"}}>
                <h3>Pricing</h3>
                🆓 Free forever!
              </div>
              <Button type="primary" ghost style={{position: "absolute", width: "85%", bottom: 10, maxWidth: 400}}>Get Started</Button>
            </Card>
            
          </Col>
          <Col md={{span: 8}} xs={{span: 24}} style={{display: "flex"}}>
            <Card title="API Based" bordered={true}>
              🦾 Model Type: <code>SQLCoder-34b-instruct</code> <Tooltip title="Our most capable closed-source model with 91% accuracy on `sql-eval`">ℹ</Tooltip> <br/>
              🚀 Usage-based pricing using API credits <Tooltip title="The model is hosted on our servers and can be accessed via API, using a credit based system">ℹ</Tooltip> <br/>
              ✅ Follows-instructions <Tooltip title="The model is great at following specialized instructions">ℹ</Tooltip> <br/>
              ❌ No fine tuning <Tooltip title="Model works great for complex questions that do not require specialized domain knowledge">ℹ</Tooltip> <br/>
              👷🏽‍♂️ Generalist agent capabilities <Tooltip title="The model is proficient at solving generalist problems involving multiple steps.">ℹ</Tooltip> <br/>
              🔐 Metadata shared with our SOC-2 compliant server

              <hr style={{marginTop: "1em", border: "1px solid rgba(0,0,0,0.1)"}} />
              <div style={{paddingBottom: "2em"}}>
                <h3>Pricing</h3>
                🆓 1000 free API credits per month <br/>
                💰 $0.03 per API credit <br/>
                - Every 500 tokens of a SQL generated = 1 API credit <br/>
                - Every action taken by an agent = 1 API credit <br/>
              </div>
              <Button type="primary" style={{position: "absolute", width: "85%", bottom: 10, maxWidth: 400}}>Get Started</Button>
            </Card>
          </Col>
          <Col md={{span: 8}} xs={{span: 24}} style={{display: "flex"}}>
            <Card title="Locally hosted (Enterprise)" bordered={true}>
              🦾 Model Type: <code>SQLCoder-34b-instruct</code> <Tooltip title="Our most capable closed-source model with 91% accuracy on `sql-eval`">ℹ</Tooltip> <br/>
              🤝 Annual contracts for on-prem deployment <Tooltip title="The model is hosted on your servers, along with a Docker image for data access, visualization, and other tools">ℹ</Tooltip> <br/>
              ✅ Follows-instructions <Tooltip title="The model is great at following specialized instructions">ℹ</Tooltip> <br/>
              ✅ Fine-tuned model <Tooltip title="Model can be fine-tuned great for complex questions that require specialized domain knowledge, like healthcare and finance">ℹ</Tooltip> <br/>
              👷🏽‍♂️ Specialized agents (incl healthcare and finance) <Tooltip title="The model is proficient at solving specialist problems involving multiple steps and requiring niche domain knowledge.">ℹ</Tooltip> <br/>
              🔐 Complete data privacy with no data sharing

              <hr style={{marginTop: "1em", border: "1px solid rgba(0,0,0,0.1)"}} />
              <div style={{paddingBottom: "2em"}}>
                <h3>Pricing</h3>
                💰 Pilots at $5k for 8 weeks<br/>
                💰 Annual contracts between $60k/yr to $500,000k/yr<br/>
              </div>
              <Button type="primary" ghost style={{position: "absolute", width: "85%", bottom: 10, maxWidth: 400}}>Contact Us</Button>
            </Card>

          </Col>
        </Row>
      </Scaffolding>
    </>
  )
}

export default QueryDatabase;