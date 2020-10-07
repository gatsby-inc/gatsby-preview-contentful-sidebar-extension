import React from "react";
import ReactDOM from "react-dom";
import { Button, Paragraph, FieldGroup, RadioButtonField } from "@contentful/forma-36-react-components";
import { init } from "contentful-ui-extensions-sdk";
import "@contentful/forma-36-react-components/dist/styles.css";
import "./index.css";

class App extends React.Component {
  constructor(props) {
    super(props);
    const { isAutoUpdate } = this.props.sdk.parameters.instance;

    this.state = {
      isAutoUpdate,
    }
  }

  componentDidMount = () => {
    this.detachFn = this.props.sdk.entry.onSysChanged(this.onSysChanged);

    this.props.sdk.window.startAutoResizer();
  };

  componentWillUnmount = () => {
    this.detachFn();
    if (this.debounceInterval) {
      clearInterval(this.debounceInterval);
    }
  };

  onError = error => {
    this.setState({ working: false });
    this.props.sdk.notifier.error(error.message);
  };

  onSysChanged = () => {
    if (this.debounceInterval) {
      clearInterval(this.debounceInterval);
    }
    if (!this.state.isAutoUpdate) {
      return
    }
    this.debounceInterval = setInterval(this.refreshGatsbyPreview, 1000);
  };

  refreshGatsbyPreview = () => {
    if (this.debounceInterval) {
      clearInterval(this.debounceInterval);
    }

    const { webhookUrl } = this.props.sdk.parameters.installation;

    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-preview-update-source": "contentful-sidebar-extension"
      },
      body: JSON.stringify({})
    }).then(
      () => this.props.sdk.notifier.success("Gatsby Preview updated!"),
      () => this.props.sdk.notifier.error("Gatsby Preview failed :(")
    );
  };

  openPreviewTab = async () => {
    const {
      parameters: { installation, instance },
      entry
    } = this.props.sdk;
    const { previewUrl } = installation;
    const { contentTypeSlug } = instance;
    const { slug: contentSlug } = entry.fields;

    try {
      const slug = await fetch(`${previewUrl}/___graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query:
            "query getQualifiedSlug($slugExpr:String) { sitePage( path:{ regex:$slugExpr } ) { path } }",
          variables: {
            slugExpr: `/${
              contentSlug ? contentSlug.getValue() : contentTypeSlug
            }\/?$/`
          }
        })
      })
        .then(res => res.json())
        .then(json => (json && json.data ? json.data.sitePage.path : ``));

      const normalize = part => part.replace(/\/$/, "");
      window.open(`${normalize(previewUrl)}/${slug}`);
    } catch (e) {
      console.error(e);

      let slug = contentTypeSlug ? contentTypeSlug : "";

      if (this.props.sdk.entry.fields.slug) {
        slug += "/" + contentSlug.getValue();
      }

      window.open(`${previewUrl}${slug}`);
    }
  };

  onAutoUpdateChange = (e) => {
    this.setState({ isAutoUpdate: e.target.value === "yes" });
  }

  render = () => {
    return (
      <div className="extension">
        <div className="flexcontainer">
          <Button
            buttonType="positive"
            onClick={this.openPreviewTab}
            isFullWidth
          >
            Open preview
          </Button>
          <FieldGroup row={true}>
            <RadioButtonField
              labelText="Auto-update"
              disabled={false}
              checked={this.state.isAutoUpdate}
              value="yes"
              onChange={this.onAutoUpdateChange}
              labelIsLight
              name="autoUpdate"
              id="checkbox1"
            />
            <RadioButtonField
              labelText="Manual update"
              disabled={false}
              checked={!this.state.isAutoUpdate}
              name="someOption"
              value="no"
              onChange={this.onAutoUpdateChange}
              labelIsLight
              name="autoUpdate"
              id="checkbox2"
            />
          </FieldGroup>
          <Button
            buttonType="primary"
            onClick={this.refreshGatsbyPreview}
            isFullWidth
          >
            Update preview
          </Button>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Paragraph style={{ marginRight: "5%" }}>Powered by:</Paragraph>

            <img
              src={require("./gatsby.svg")}
              className="gatsby-logo"
              alt="Gatsby"
            />
          </div>
        </div>
      </div>
    );
  };
}

init(sdk => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById("root"));
});
