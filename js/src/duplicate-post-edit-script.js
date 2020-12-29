/* global duplicatePost, duplicatePostNotices */

import { registerPlugin } from "@wordpress/plugins";
import { PluginPostStatusInfo } from "@wordpress/edit-post";
import { Fragment } from "@wordpress/element";
import { Button } from '@wordpress/components';
import { __ } from "@wordpress/i18n";
import { select, subscribe, dispatch } from "@wordpress/data";


class DuplicatePost {
	constructor() {
		this.doRedirect = this.doRedirect.bind( this );

		this.renderNotices();
		this.removeSlugSidebarPanel();
		this.shouldRedirectToCheckLink = false;
	}

	/**
	 * Handles the redirect from the copy to the original.
	 *
	 * @returns {void}
	 */
	handleRedirect() {
		if ( ! parseInt( duplicatePost.rewriting, 10 ) ) {
			return;
		}

		let wasSavingPost      = false;
		let wasSavingMetaboxes = false;
		let wasAutoSavingPost  = false;

		/**
		 * Determines when the redirect needs to happen.
		 *
		 * @returns {void}
		 */
		subscribe(() => {
			const completed = this.redirectOnSaveCompletion( duplicatePost.originalEditURL, { wasSavingPost, wasSavingMetaboxes, wasAutoSavingPost } );

			wasSavingPost      = completed.isSavingPost;
			wasSavingMetaboxes = completed.isSavingMetaBoxes;
			wasAutoSavingPost = completed.isAutosavingPost;
		});
	}

	/**
	 * Redirects to url when saving in the block editor has completed.
	 *
	 * @param {string} url         The url to redirect to.
	 * @param {Object} editorState The current editor state regarding saving the post, metaboxes and autosaving.
	 *
	 * @returns {Object} The updated editor state.
	 */
	redirectOnSaveCompletion = (editorState) => {
		const isSavingPost       = select('core/editor').isSavingPost();
		const isAutosavingPost   = select('core/editor').isAutosavingPost();
		const hasActiveMetaBoxes = select('core/edit-post').hasMetaBoxes();
		const isSavingMetaBoxes  = select('core/edit-post').isSavingMetaBoxes();


		// When there are custom meta boxes, redirect after they're saved.
		if ( hasActiveMetaBoxes && ! isSavingMetaBoxes && editorState.wasSavingMetaboxes ) {
			setTimeout( this.doRedirect, 100 );
		}

		// When there are no custom meta boxes, redirect after the post is saved.
		if ( ! hasActiveMetaBoxes && ! isSavingPost && editorState.wasSavingPost && !editorState.wasAutoSavingPost ) {
			setTimeout( this.doRedirect, 100 );
		}

		return { isSavingPost, isSavingMetaBoxes, isAutosavingPost };
	};

	/**
	 * Redirects the pages to either the check link or the original edit URL.
	 */
	doRedirect() {
		const url = this.shouldRedirectToCheckLink ? duplicatePost.checkLink : duplicatePost.originalEditUrl;
		if ( this.isCopyAllowedToBeRepublished() || this.shouldRedirectToCheckLink ) {
			window.location.assign( url );
		}
	}

	/**
	 * Determines whether a Rewrite & Republish copy can be republished.
	 *
	 * @return bool Whether the Rewrite & Republish copy can be republished.
	 */
	isCopyAllowedToBeRepublished() {
		const currentPostStatus = select( 'core/editor' ).getEditedPostAttribute( 'status' );

		if ( currentPostStatus === 'dp-rewrite-republish' || currentPostStatus === 'private' ) {
			return true;
		}

		return false;
	}

	/**
	 * Renders the notices in the block editor.
	 *
	 * @returns {void}
	 */
	renderNotices() {
		if ( ! duplicatePostNotices || ! ( duplicatePostNotices instanceof Object ) ) {
			return;
		}

		for ( const [ key, notice ] of Object.entries( duplicatePostNotices ) ){
			let noticeObj = JSON.parse( notice );
			if ( noticeObj.status && noticeObj.text ) {
				dispatch( 'core/notices' ).createNotice(
					noticeObj.status,
					noticeObj.text,
					{
						isDismissible: noticeObj.isDismissible || true,
					}
				);
			}
		}
	}

	/**
	 * Removes the slug panel from the block editor sidebar when the post is a Rewrite & Republish copy.
	 *
	 * @returns {void}
	 */
	removeSlugSidebarPanel() {
		if ( parseInt( duplicatePost.rewriting, 10 ) ) {
			dispatch( 'core/edit-post' ).removeEditorPanel( 'post-link' );
		}
	}

	/**
	 * Renders the links in the PluginPostStatusInfo component.
	 *
	 * @returns {JSX.Element} The rendered links.
	 */
	render() {
		const currentPostStatus = select( 'core/editor' ).getEditedPostAttribute( 'status' );

		return (
			<Fragment>
				{ ( duplicatePost.newDraftLink !== '' && duplicatePost.showLinks.new_draft === '1' ) &&
					<PluginPostStatusInfo>
						<Button
							isTertiary={ true }
							className="dp-editor-post-copy-to-draft"
							href={ duplicatePost.newDraftLink }
						>
							{ __( 'Copy to a new draft', 'duplicate-post' ) }
						</Button>
					</PluginPostStatusInfo>
				}
				{ ( currentPostStatus === 'publish' && duplicatePost.rewriteAndRepublishLink !== '' && duplicatePost.showLinks.rewrite_republish === '1' ) &&
					<PluginPostStatusInfo>
						<Button
							isTertiary={ true }
							className="dp-editor-post-rewrite-republish"
							href={ duplicatePost.rewriteAndRepublishLink }
						>
							{ __( 'Rewrite & Republish', 'duplicate-post' ) }
						</Button>
					</PluginPostStatusInfo>
				}
			</Fragment>
		);
	}
}

const instance = new DuplicatePost();
instance.handleRedirect();

registerPlugin( 'duplicate-post', {
	render: instance.render
} );
