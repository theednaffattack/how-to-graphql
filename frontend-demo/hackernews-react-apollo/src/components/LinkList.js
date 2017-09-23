import React, { Component } from "react";
import { graphql, gql } from "react-apollo";
import Link from "./Link";

class LinkList extends Component {
  render() {
    // const linksToRender = [
    //   {
    //     id: "1",
    //     description: "The Coolest GraphQL Backend 😎",
    //     url: "https://www.graph.cool"
    //   },
    //   {
    //     id: "2",
    //     description: "The Best GraphQL Client",
    //     url: "http://dev.apollodata.com/"
    //   }
    // ];

    if (this.props.allLinksQuery && this.props.allLinksQuery.loading) {
      return <div>Loading</div>;
    }

    if (this.props.allLinksQuery && this.props.allLinksQuery.error) {
      return <div>Error</div>;
    }

    const linksToRender = this.props.allLinksQuery.allLinks;

    return (
      <div>{linksToRender.map(link => <Link key={link.id} link={link} />)}</div>
    );
  }
}

const ALL_LINKS_QUERY = gql`
  query AllLinksQuery {
    allLinks {
      id
      createdAt
      url
      description
    }
  }
`;

export default graphql(ALL_LINKS_QUERY, { name: "allLinksQuery" })(LinkList);
